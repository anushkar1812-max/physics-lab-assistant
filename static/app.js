const componentNotes = {
 battery: ["Battery / accumulator", "Supplies the potential difference that drives current around the circuit. The reference experiment specifies a 0–3 V battery eliminator or accumulator.", "SOURCE · 0–3 V"],
 key: ["Plug key", "Opens or closes the circuit. Keep it inserted only while taking a reading so the wire does not heat up.", "SWITCH · SERIES CIRCUIT"],
 rheostat: ["Rheostat", "A variable resistance used to change the current. Begin with the setting that gives minimum current, then adjust slightly between readings.", "CONTROL · VARIABLE RESISTANCE"],
 ammeter: ["Milliammeter", "Measures current through the test wire, so it is connected in series. The reference apparatus uses a 0–500 mA range.", "MEASUREMENT · SERIES"],
 voltmeter: ["Voltmeter", "Measures potential difference across the test wire, so it is connected in parallel. The reference apparatus uses a 0–5 V range.", "MEASUREMENT · PARALLEL"],
 wire: ["Resistance wire", "The wire whose resistance is being determined. The reference experiment describes a wire of about 10 Ω and length about 0.50 m.", "TEST COMPONENT · UNKNOWN R"]
};
document.querySelectorAll(".component").forEach(el => {
  const activate = () => {
    document.querySelectorAll(".component").forEach(x => x.classList.remove("selected"));
    el.classList.add("selected");
    const note = componentNotes[el.dataset.part];
    document.getElementById("part-title").textContent = note[0];
    document.getElementById("part-description").textContent = note[1];
    document.getElementById("part-tag").textContent = note[2];
  };
  el.addEventListener("click", activate);
  el.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }});
});

const tbody = document.getElementById("reading-body");
for(let n=1;n<=6;n++){
  const tr=document.createElement("tr");
  tr.dataset.row=n;
  tr.innerHTML=`<td>${String(n).padStart(2,"0")}</td><td><input type="number" step="any" class="voltage" aria-label="Voltage reading ${n}"></td><td><input type="number" step="any" class="current" aria-label="Current reading ${n}"></td><td class="ratio">—</td><td class="status-cell">Waiting for readings</td>`;
  tbody.appendChild(tr);
}
const rows = () => [...tbody.querySelectorAll("tr")].map(tr=>({v:tr.querySelector(".voltage").value,i:tr.querySelector(".current").value}));
function drawGraph(points, slope){
  const canvas=document.getElementById("plot"),ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  const pad={l:75,r:35,t:25,b:60}, usableW=w-pad.l-pad.r,usableH=h-pad.t-pad.b;
  const maxV=Math.max(1,...points.map(p=>p.v))*1.12, maxI=Math.max(.1,...points.map(p=>p.i))*1.2;
  const x=v=>pad.l+v/maxV*usableW, y=i=>h-pad.b-i/maxI*usableH;
  ctx.font="16px sans-serif";ctx.strokeStyle="#dce3dc";ctx.fillStyle="#687a76";ctx.lineWidth=1;
  for(let k=0;k<=5;k++){let yy=pad.t+k*usableH/5;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillText((maxI*(5-k)/5).toFixed(2),15,yy+5);}
  for(let k=0;k<=5;k++){let xx=pad.l+k*usableW/5;ctx.beginPath();ctx.moveTo(xx,pad.t);ctx.lineTo(xx,h-pad.b);ctx.stroke();ctx.fillText((maxV*k/5).toFixed(1),xx-12,h-pad.b+25);}
  ctx.strokeStyle="#243e39";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,h-pad.b);ctx.lineTo(w-pad.r,h-pad.b);ctx.stroke();
  ctx.fillStyle="#243e39";ctx.font="17px sans-serif";ctx.fillText("Potential difference V (volt)",w/2-100,h-12);
  ctx.save();ctx.translate(20,h/2+60);ctx.rotate(-Math.PI/2);ctx.fillText("Current I (ampere)",0,0);ctx.restore();
  if(Number.isFinite(slope)){ctx.strokeStyle="#0c766d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x(0),y(0));ctx.lineTo(x(maxV),y(slope*maxV));ctx.stroke();}
  points.forEach(p=>{ctx.beginPath();ctx.arc(x(p.v),y(p.i),7,0,Math.PI*2);ctx.fillStyle=p.status==="bad"?"#bd5144":"#0c766d";ctx.fill();});
}
document.getElementById("analyse").addEventListener("click",async()=>{
  const payload={readings:rows(),lc_v:document.getElementById("lc-v").value,lc_i:document.getElementById("lc-i").value,length:document.getElementById("length").value};
  const resultBox=document.getElementById("analysis-result");
  resultBox.textContent="Analysing readings…";
  try{
    const response=await fetch("/api/analyse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok||data.error)throw new Error(data.error||"Could not analyse readings.");
    data.rows.forEach(item=>{
      const tr=tbody.querySelector(`tr[data-row="${item.row}"]`);
      tr.className=item.status;
      tr.querySelector(".ratio").textContent=item.ratio==null?"—":item.ratio.toFixed(2);
      tr.querySelector(".status-cell").textContent=item.message|| (item.status==="empty"?"—":item.status);
    });
    resultBox.textContent=data.summary;
    drawGraph(data.graph||[],data.slope);
  }catch(err){resultBox.textContent=err.message;}
});
document.getElementById("sample").addEventListener("click",()=>{
  const sample=[[1,96],[1.5,144],[2,192],[2.5,240],[3,288],[2.8,120]];
  [...tbody.querySelectorAll("tr")].forEach((tr,i)=>{tr.querySelector(".voltage").value=sample[i][0];tr.querySelector(".current").value=sample[i][1];});
  document.getElementById("analysis-result").textContent="Example readings loaded. Select Analyse readings to check them.";
});
document.getElementById("clear").addEventListener("click",()=>{
  [...tbody.querySelectorAll("input")].forEach(i=>i.value="");
  [...tbody.querySelectorAll("tr")].forEach(tr=>{tr.className="";tr.querySelector(".ratio").textContent="—";tr.querySelector(".status-cell").textContent="Waiting for readings";});
  document.getElementById("analysis-result").textContent="Table cleared. Enter your own readings.";
  drawGraph([],NaN);
});
drawGraph([],NaN);

const quizForm=document.getElementById("quiz-form");
quizForm.addEventListener("change",()=>{
  const answered=quizForm.querySelectorAll('input[type="radio"]:checked').length;
  document.getElementById("quiz-progress").textContent=`${answered} / 10 answered`;
});
quizForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const answers=[];
  for(let i=0;i<10;i++){
    const selected=quizForm.querySelector(`input[name="q${i}"]:checked`);
    answers.push(selected?Number(selected.value):null);
  }
  const response=await fetch("/api/quiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers})});
  const data=await response.json();
  document.getElementById("quiz-result").textContent=`Your score: ${data.score} / ${data.total}. ${data.score>=8?"Strong work — revise the explanations below.":"Review the explanations and give it another try."}`;
  data.feedback.forEach((item,i)=>{
    const field=quizForm.querySelector(`fieldset:nth-of-type(${i+1})`);
    field.querySelectorAll(".option").forEach((label,j)=>{
      label.classList.remove("correct-option","wrong-option");
      if(j===item.answer)label.classList.add("correct-option");
      if(answers[i]===j&&!item.correct)label.classList.add("wrong-option");
    });
    document.getElementById(`explain-${i}`).textContent=(item.correct?"Correct. ":"Review: ")+item.why;
  });
});
document.getElementById("retry").addEventListener("click",()=>{
  quizForm.reset();
  document.getElementById("quiz-result").textContent="Complete the questions and submit to see your score.";
  document.getElementById("quiz-progress").textContent="0 / 10 answered";
  quizForm.querySelectorAll(".option").forEach(x=>x.classList.remove("correct-option","wrong-option"));
  quizForm.querySelectorAll(".explanation").forEach(x=>x.textContent="");
});
