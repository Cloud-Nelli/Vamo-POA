import base64
import io
import os
from pathlib import Path

import qrcode
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".")


def load_env():
    env_path = Path(__file__).with_name(".env")
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"'))


def field(identifier, value):
    value = str(value)
    return f"{identifier}{len(value):02d}{value}"


def crc16(payload):
    crc = 0xFFFF
    for char in payload:
        crc ^= ord(char) << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def pix_payload(amount, transaction_id):
    key = os.getenv("PIX_KEY", "")
    if not key or key == "sua-chave-pix-aqui":
        raise ValueError("Configure sua chave PIX no arquivo .env antes de finalizar a compra.")
    merchant_account = field("00", "br.gov.bcb.pix") + field("01", key)
    name = os.getenv("PIX_RECEIVER_NAME", "VAMOO CLUB")[:25]
    city = os.getenv("PIX_CITY", "PORTO ALEGRE")[:15]
    payload = (
        "000201" + field("26", merchant_account) + "52040000" + "5303986" +
        field("54", f"{amount:.2f}") + "5802BR" + field("59", name) + field("60", city) +
        field("62", field("05", transaction_id[:25])) + "6304"
    )
    return payload + crc16(payload)


@app.get("/")
def home():
    return send_from_directory(".", "index.html")


@app.post("/api/pix")
def create_pix():
    data = request.get_json(silent=True) or {}
    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            raise ValueError("O valor da compra precisa ser maior que zero.")
        payload = pix_payload(amount, data.get("transactionId", "VAMOO"))
        qr = qrcode.make(payload)
        buffer = io.BytesIO()
        qr.save(buffer, format="PNG")
        image = base64.b64encode(buffer.getvalue()).decode()
        return jsonify({"payload": payload, "qrCode": f"data:image/png;base64,{image}"})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


if __name__ == "__main__":
    load_env()
    app.run(debug=True, port=5000)
