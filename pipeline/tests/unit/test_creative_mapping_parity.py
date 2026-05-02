"""Cross-validation: creative mapping Python ↔ TypeScript parity.

Reads shared fixtures from tests/cross-validation/creative_mapping_fixtures.json
and verifies the Python implementation produces identical outputs.
The gallery vitest (creativeMapping.test.ts) validates the TS side
against the same fixture file.
"""

import json
from pathlib import Path

import pytest

from oceancanvas.creative_mapping import creative_to_technical

FIXTURES_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "tests" / "cross-validation" / "creative_mapping_fixtures.json"
)


@pytest.fixture()
def fixtures():
    return json.loads(FIXTURES_PATH.read_text())


class TestCreativeMappingParity:
    def test_fixtures_exist(self):
        assert FIXTURES_PATH.exists(), f"Fixture file not found: {FIXTURES_PATH}"

    def test_all_presets_match(self, fixtures):
        for case in fixtures:
            inp = case["input"]
            expected = case["expected"]
            actual = creative_to_technical(
                energy_x=inp["energy_x"],
                energy_y=inp["energy_y"],
                colour_character=inp["colour_character"],
                temporal_weight=inp["temporal_weight"],
            )
            for key, val in expected.items():
                assert actual[key] == val, (
                    f"{case['name']}: {key} mismatch — "
                    f"expected {val}, got {actual[key]}"
                )
