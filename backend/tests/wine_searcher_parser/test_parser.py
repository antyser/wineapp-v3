import json
import os
from typing import Any, Dict

import pytest
from bs4 import BeautifulSoup

from backend.src.crawler.wine_searcher_parser.model import (
    Vintages,
    WineProfile,
    WineSearcherOffer,
    WineSearcherWine,
)
from backend.src.crawler.wine_searcher_parser.parser import (
    fetch_and_parse_wine,
    parse_offer,
    parse_offers,
    parse_profile_tab,
    parse_vintages_tab,
    parse_wine_searcher_html,
)

# Constants
TEST_DATA_FOLDER = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(TEST_DATA_FOLDER, "inputs")
OUTPUT_DIR = os.path.join(TEST_DATA_FOLDER, "outputs")


def get_test_cases():
    """
    Get all test cases by pairing input HTML files with expected output JSON files.
    """
    test_cases = []
    for input_filename in os.listdir(INPUT_DIR):
        if input_filename.endswith(".html"):
            base_name = input_filename[:-5]  # remove .html
            output_filename = f"{base_name}_output.json"
            input_path = os.path.join(INPUT_DIR, input_filename)
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            if os.path.exists(output_path):
                test_cases.append((input_path, output_path))
    return test_cases


@pytest.mark.parametrize("input_file, expected_file", get_test_cases())
def test_parser(input_file, expected_file):
    """
    Test the parser by comparing its output to the expected JSON.
    """
    with open(input_file, "r", encoding="utf-8") as f:
        html_content = f.read()

    result = parse_wine_searcher_html(html_content)

    with open(expected_file, "r", encoding="utf-8") as f:
        expected_data = json.load(f)

    # Compare the parsed data dict with the expected JSON
    assert result is not None, "Parser returned None"
    assert result.model_dump() == expected_data


def test_profile_tab_parser():
    """
    Test the profile tab parser with a sample HTML snippet.
    """
    # This test will be implemented once we have test data
    pass


def test_vintages_tab_parser():
    """
    Test the vintages tab parser with a sample HTML snippet.
    """
    # This test will be implemented once we have test data
    pass


def test_offers_parser():
    """
    Test the offers parser with a sample HTML snippet.
    """
    # This test will be implemented once we have test data
    pass


def create_sample_input_output():
    """
    Helper function to create sample input/output pairs for testing.
    This is useful for development but should not be used in the final tests.
    """
    # Example of how to create a test case:
    """
    html_content = "<html>...</html>"
    wine_data = {
        "id": "12345",
        "name": "Test Wine",
        # ... other fields
    }
    
    base_name = "sample_wine"
    input_path = os.path.join(INPUT_DIR, f"{base_name}.html")
    output_path = os.path.join(OUTPUT_DIR, f"{base_name}_output.json")
    
    with open(input_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(wine_data, f, indent=2)
    """
    pass
