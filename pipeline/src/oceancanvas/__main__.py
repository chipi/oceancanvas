"""Allow running the pipeline as: python -m oceancanvas.flow"""

from oceancanvas.flow import daily_ocean_pipeline

if __name__ == "__main__":
    import sys
    test_mode = "--test-mode" in sys.argv
    daily_ocean_pipeline(test_mode=test_mode)
