def header(title):
    width = 50
    print()
    print("=" * width)
    print(f" {title}".center(width))
    print("=" * width)


def separator():
    print("-" * 50)


def success(msg):
    print(f"\n  [OK] {msg}")


def error(msg):
    print(f"\n  [ERROR] {msg}")


def info(msg):
    print(f"\n  [INFO] {msg}")


def format_currency(value):
    return f"${value:,.0f}"


def print_table(headers, rows):
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))

    fmt = "  ".join(f"{{:<{w}}}" for w in col_widths)

    print()
    print("  " + fmt.format(*headers))
    print("  " + "  ".join("-" * w for w in col_widths))
    for row in rows:
        print("  " + fmt.format(*[str(c) for c in row]))
    print()
