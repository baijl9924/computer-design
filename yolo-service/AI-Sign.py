import base64
import hashlib
import os
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from zhipuai import ZhipuAI


def get_llm_password():
    api_key = os.getenv("ZHIPUAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ZHIPUAI_API_KEY is required to run this experiment script.")
    client = ZhipuAI(api_key=api_key)
    model_name = "GLM" + chr(45) + "4" + chr(45) + "Flash"
    sys_prompt = "You are a password generator.\nOutput ONE password only.\nFormat strictly: pw" + chr(
        45) + "xxxxxxxx where x are letters.\nNo explanation, no quotes, no punctuation."

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": "Generate the password now."}
        ],
        temperature=0.28
    )
    return response.choices[0].message.content


def decrypt_flag(llm_output):
    iv_b64 = "HT/nfAGhj3ui+D9vzXJ/fw=="
    ciphertext_b64 = "/uHktBcudcOHeZkCn9RrG5ivMYGUMXTnCC+Vgo0f/ut9n5v5jryr11GErh3fhEfJ"

    iv = base64.b64decode(iv_b64)
    ciphertext = base64.b64decode(ciphertext_b64)

    key = hashlib.sha256(llm_output.encode()).digest()[:16]

    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_padded = cipher.decrypt(ciphertext)

    try:
        return unpad(decrypted_padded, AES.block_size).decode()
    except ValueError:
        return "Decryption failed or incorrect LLM output."


if __name__ == "__main__":
    while 1:
        password = get_llm_password()
        print("LLM Output: ", password)

        print("Attempt 1 Full String: ")
        flag1 = decrypt_flag(password)
        print("Result 1: ", flag1)

        print("Attempt 2 Stripped: ")
        stripped_password = password[3:]
        flag2 = decrypt_flag(stripped_password)
        print("Result 2: ", flag2)
