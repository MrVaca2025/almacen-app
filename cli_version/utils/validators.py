def validate_name(name):
    if not name or not name.strip():
        return False, "El nombre no puede estar vacío."
    return True, ""


def validate_price(value):
    try:
        price = float(value)
    except (ValueError, TypeError):
        return False, "El precio debe ser un número."
    if price < 0:
        return False, "El precio debe ser >= 0."
    return True, ""


def validate_stock(value):
    try:
        stock = int(value)
    except (ValueError, TypeError):
        return False, "El stock debe ser un número entero."
    if stock < 0:
        return False, "El stock debe ser >= 0."
    return True, ""


def validate_positive_int(value):
    try:
        n = int(value)
    except (ValueError, TypeError):
        return False, "Debe ser un número entero positivo."
    if n <= 0:
        return False, "Debe ser un número entero positivo."
    return True, ""


def input_int(prompt, allow_empty=False):
    while True:
        raw = input(prompt).strip()
        if allow_empty and raw == "":
            return None
        try:
            return int(raw)
        except ValueError:
            print("  [ERROR] Ingrese un número entero válido.")


def input_float(prompt, allow_empty=False):
    while True:
        raw = input(prompt).strip()
        if allow_empty and raw == "":
            return None
        try:
            return float(raw)
        except ValueError:
            print("  [ERROR] Ingrese un número válido.")


def input_text(prompt, allow_empty=False):
    while True:
        raw = input(prompt).strip()
        if raw:
            return raw
        if allow_empty:
            return ""
        print("  [ERROR] Este campo no puede estar vacío.")
