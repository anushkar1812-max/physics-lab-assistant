from flask import Flask, render_template, request, jsonify
from statistics import median
import math

app = Flask(__name__)

VIVA = [
    {"q":"What is the SI unit of resistance?", "opts":["Ampere","Volt","Ohm","Watt"], "a":2,
     "why":"Resistance is measured in ohms (Ω)."},
    {"q":"How is a voltmeter connected?", "opts":["In series","In parallel","Across the battery only","It is not connected"], "a":1,
     "why":"A voltmeter measures potential difference across a component, so it is connected in parallel."},
    {"q":"How is an ammeter connected?", "opts":["In parallel","In series","Across the resistor","Either way"], "a":1,
     "why":"An ammeter measures the current through the circuit and is connected in series."},
    {"q":"What is the mathematical form of Ohm's law?", "opts":["V = IR","P = VI","R = I/V","V = I/R"], "a":0,
     "why":"At constant physical conditions, V is directly proportional to I: V = IR."},
    {"q":"Why should the key be removed between readings?", "opts":["To increase voltage","To cool the wire","To increase resistance permanently","To discharge the voltmeter"], "a":1,
     "why":"Heating can change the wire's resistance, so the key is kept closed only while taking a reading."},
    {"q":"What does the slope of an I versus V graph represent?", "opts":["Resistance","Power","Reciprocal of resistance","Charge"], "a":2,
     "why":"I = V/R, so the slope of I against V is 1/R."},
    {"q":"Which instrument has very high resistance?", "opts":["Ammeter","Voltmeter","Rheostat","Key"], "a":1,
     "why":"A voltmeter has very high resistance so it draws negligible current."},
    {"q":"Which instrument has very low resistance?", "opts":["Voltmeter","Ammeter","Battery","Resistor"], "a":1,
     "why":"An ammeter has very low resistance to avoid changing the circuit current."},
    {"q":"Which graph is expected for an ohmic conductor at constant temperature?", "opts":["A circle","A straight line through origin","A parabola","A horizontal line"], "a":1,
     "why":"For an ohmic conductor, V is proportional to I at constant physical state."},
    {"q":"What is resistance per unit length?", "opts":["R × l","R/l","l/R","1/(R × l)"], "a":1,
     "why":"Resistance per unit length is the resistance divided by the wire length."}
]

def analyse_readings(payload):
    rows = payload.get("readings", [])
    lc_v = float(payload.get("lc_v", 0.1))
    lc_i = float(payload.get("lc_i", 5))
    length = float(payload.get("length", 0) or 0)
    if lc_v <= 0 or lc_i <= 0:
        return {"error": "Least counts must be greater than zero."}

    valid = []
    output = []
    for idx, row in enumerate(rows, 1):
        v = row.get("v")
        i = row.get("i")
        if v in (None, "") and i in (None, ""):
            output.append({"row": idx, "status": "empty", "ratio": None, "message": ""})
            continue
        try:
            v, i = float(v), float(i)
        except (TypeError, ValueError):
            output.append({"row": idx, "status": "bad", "ratio": None, "message": "Enter both voltage and current as numbers."})
            continue
        messages = []
        if v <= 0 or i <= 0:
            messages.append("Both readings must be positive.")
        if i < 1:
            messages.append("Current looks like it is in amperes; enter current in mA.")
        if v > 5:
            messages.append("Voltage is beyond the stated 0–5 V meter range.")
        if i > 500:
            messages.append("Current is beyond the stated 0–500 mA meter range.")
        ratio = v / (i / 1000) if v > 0 and i > 0 else None
        item = {"row": idx, "v": v, "i": i, "ratio": ratio}
        if messages:
            output.append({**item, "status": "bad", "message": " ".join(messages)})
        else:
            valid.append(item)
            output.append({**item, "status": "pending", "message": ""})

    if len(valid) < 3:
        for item in output:
            if item["status"] == "pending":
                item["status"] = "need_more"
                item["message"] = "Add at least three valid readings to check consistency."
        return {"rows": output, "summary": "Enter at least three valid readings to calculate the result.", "graph": []}

    typical_r = median([x["ratio"] for x in valid])
    good = []
    for item in output:
        if item["status"] != "pending":
            continue
        relative_tolerance = lc_v / item["v"] + lc_i / item["i"] + 0.03
        deviation = abs(item["ratio"] - typical_r) / typical_r
        if deviation > relative_tolerance:
            item["status"] = "bad"
            item["message"] = (
                f"V/I = {item['ratio']:.2f} Ω differs from the typical value "
                f"({typical_r:.2f} Ω). Recheck this reading and meter connections."
            )
        else:
            item["status"] = "good"
            item["message"] = "Consistent with the other readings."
            good.append(item)

    if len(good) < 2:
        return {"rows": output, "summary": "Too few consistent readings remain. Recheck the flagged values.", "graph": []}

    # Least-squares fit for I = mV through the origin. R = 1/m.
    slope = sum(x["v"] * (x["i"] / 1000) for x in good) / sum(x["v"] ** 2 for x in good)
    resistance = 1 / slope
    mean_v = sum(x["v"] for x in good) / len(good)
    mean_i = sum(x["i"] for x in good) / len(good)
    delta_r = resistance * (lc_v / mean_v + lc_i / mean_i)
    summary = (
        f"Slope of I–V graph = {slope:.4f} A/V. "
        f"Resistance R = 1/slope = {resistance:.2f} Ω. "
        f"Estimated result: ({resistance:.2f} ± {delta_r:.2f}) Ω."
    )
    if length > 0:
        summary += f" Resistance per unit length = ({resistance/length:.2f} ± {delta_r/length:.2f}) Ω m⁻¹."
    else:
        summary += " Enter the wire length to calculate resistance per unit length."

    graph = [{"v": x["v"], "i": x["i"] / 1000, "status": x["status"]} for x in output if x.get("ratio") is not None]
    return {"rows": output, "summary": summary, "graph": graph,
            "slope": slope, "resistance": resistance, "delta_r": delta_r}

@app.get("/")
def home():
    return render_template("index.html", viva=VIVA)

@app.post("/api/analyse")
def api_analyse():
    try:
        result = analyse_readings(request.get_json(force=True))
        return jsonify(result)
    except (ValueError, TypeError, ZeroDivisionError):
        return jsonify({"error": "Please check that all numerical fields contain valid values."}), 400

@app.post("/api/quiz")
def api_quiz():
    answers = request.get_json(force=True).get("answers", [])
    score = 0
    feedback = []
    for idx, question in enumerate(VIVA):
        chosen = answers[idx] if idx < len(answers) else None
        correct = chosen == question["a"]
        score += int(correct)
        feedback.append({"correct": correct, "answer": question["a"], "why": question["why"]})
    return jsonify({"score": score, "total": len(VIVA), "feedback": feedback})

if __name__ == "__main__":
    app.run(debug=True)
