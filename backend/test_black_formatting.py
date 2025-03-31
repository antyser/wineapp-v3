def poorly_formatted_function(a, b, c):
    """This is a poorly formatted docstring with too many spaces."""
    if a > b:
        return a + c
    else:
        return b + c


if __name__ == "__main__":
    print("Hello, this is a test of Black formatting")
    result = poorly_formatted_function(10, 5, 3)
    print(f"Result: {result}")
