from flask import Flask, jsonify, request
from flask_cors import CORS

from flashcard_parser.studyset_parser import parse_studyset

app = Flask(__name__)
CORS(app)


@app.post("/parse-studyset")
def parse_studyset_route():
    data = request.get_json(force=True, silent=True) or {}
    lines = data.get("lines")
    if isinstance(lines, str):
        lines = lines.splitlines()
    if not isinstance(lines, list):
        return jsonify({"error": "'lines' must be a list of strings"}), 400
    study_set = parse_studyset(lines)
    if study_set is None:
        return jsonify({"error": "Failed to parse study set"}), 400
    return jsonify(study_set.to_dict())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
