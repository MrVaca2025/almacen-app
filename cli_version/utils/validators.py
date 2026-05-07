def validate_name(name):
    if not name or not name.strip():
        return False, "Name cannot be empty."
    return True, ""


def validate_price(value):
    try:
        price = float(value)
    except (ValueError, TypeError):
        return False, "Price must be a number."
    if price < 0:
        return False, "Price must be >= 0."
    return True, ""


def validate_stock(value):
    try:
        stock = int(value)
    except (ValueError, TypeError):
        return False, "Stock must be an integer."
    if stock < 0:
        return False, "Stock must be >= 0."
    return True, ""


def validate_positive_int(value):
    try:
        n = int(value)
    except (ValueError, TypeError):
        return False, "Must be a positive integer."
    if n <= 0:
        return False, "Must be a positive integer."
    return True, ""


def input_int(prompt, allow_empty=False):
    while True:
        raw = input(prompt).strip()
        if allow_empty and raw == "":
            return None
        try:
            return int(raw)
        except ValueError:
            print("  [ERROR] Please enter a valid integer.")


def input_float(prompt, allow_empty=False):
    while True:
        raw = input(prompt).strip()
        if allow_empty and raw == "":
            return None
        try:
            return float(raw)
        except ValueError:
            print("  [ERROR] Please enter a valid number.")


def input_text(prompt, allow_empty=False):
    while True:
        raw = input(prompt).strip()
        if raw:
            return raw
        if allow_empty:
            return ""
        print("  [ERROR] This field cannot be empty.")
