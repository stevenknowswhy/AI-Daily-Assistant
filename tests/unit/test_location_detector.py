#!/usr/bin/env python3
"""
Test script for Location Time Detector
======================================

This script demonstrates different scenarios and tests the fallback mechanisms
of the location_time_detector.py script.
"""

import sys
import os
from unittest.mock import patch, MagicMock
import requests

# Add current directory to path to import our module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from location_time_detector import LocationTimeDetector


def test_normal_operation():
    """Test normal operation with working APIs."""
    print("🧪 Test 1: Normal Operation")
    print("-" * 40)

    detector = LocationTimeDetector()
    location_data = detector.detect_location()

    if location_data:
        print("✅ Location detection successful")
        print(f"   Location: {detector.format_location_info(location_data)}")
        print(f"   Timezone: {location_data.get('timezone')}")
    else:
        print("❌ Location detection failed")

    print()


def test_api_failure_fallback():
    """Test fallback to system timezone when all APIs fail."""
    print("🧪 Test 2: API Failure Fallback")
    print("-" * 40)

    detector = LocationTimeDetector()

    # Mock requests.get to simulate API failures
    with patch('requests.get') as mock_get:
        # Simulate connection error
        mock_get.side_effect = requests.exceptions.ConnectionError("Simulated network error")

        location_data = detector.detect_location()

        if location_data is None:
            print("✅ Correctly handled API failures")

            # Test system timezone fallback
            system_tz = detector.get_system_timezone()
            print(f"   System timezone: {system_tz}")

            local_time, tz_obj = detector.get_local_time(system_tz)
            print(f"   Local time: {detector.format_datetime(local_time, tz_obj)}")
        else:
            print("❌ Should have failed with mocked connection error")

    print()


def test_invalid_timezone_handling():
    """Test handling of invalid timezone names."""
    print("🧪 Test 3: Invalid Timezone Handling")
    print("-" * 40)

    detector = LocationTimeDetector()

    # Test with invalid timezone
    invalid_tz = "Invalid/Timezone"
    local_time, tz_obj = detector.get_local_time(invalid_tz)

    print(f"✅ Handled invalid timezone '{invalid_tz}'")
    print(f"   Fallback timezone: {tz_obj.zone}")
    print(f"   Time: {detector.format_datetime(local_time, tz_obj)}")

    print()


def test_timezone_mapping():
    """Test timezone abbreviation mapping."""
    print("🧪 Test 4: Timezone Abbreviation Mapping")
    print("-" * 40)

    detector = LocationTimeDetector()

    # Test common timezone abbreviations
    test_timezones = ['EST', 'PST', 'GMT', 'JST']

    for tz_abbrev in test_timezones:
        local_time, tz_obj = detector.get_local_time(tz_abbrev)
        print(f"   {tz_abbrev} → {tz_obj.zone}")

    print()


def test_different_output_formats():
    """Test different datetime formatting scenarios."""
    print("🧪 Test 5: DateTime Formatting")
    print("-" * 40)

    detector = LocationTimeDetector()

    # Get current time in different timezones
    timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']

    for tz_name in timezones:
        try:
            local_time, tz_obj = detector.get_local_time(tz_name)
            formatted_time = detector.format_datetime(local_time, tz_obj)
            print(f"   {tz_name}: {formatted_time}")
        except Exception as e:
            print(f"   {tz_name}: Error - {e}")

    print()


def run_comprehensive_test():
    """Run all tests to demonstrate script capabilities."""
    print("🚀 Location Time Detector - Comprehensive Test Suite")
    print("=" * 60)
    print()

    try:
        # Test 1: Normal operation
        test_normal_operation()

        # Test 2: API failure fallback
        test_api_failure_fallback()

        # Test 3: Invalid timezone handling
        test_invalid_timezone_handling()

        # Test 4: Timezone mapping
        test_timezone_mapping()

        # Test 5: Different output formats
        test_different_output_formats()

        print("🎉 All tests completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Check if we're running the test or the main detector
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_comprehensive_test()
    else:
        print("🧪 Location Time Detector Test Script")
        print("=" * 40)
        print("Usage:")
        print("  python test_location_detector.py --test    # Run comprehensive tests")
        print("  python location_time_detector.py           # Run main detector")
        print()

        # Run a quick demo
        print("Quick demo of location detection:")
        detector = LocationTimeDetector()
        location_data = detector.detect_location()

        if location_data:
            print(f"✅ Detected: {detector.format_location_info(location_data)}")
            print(f"   Timezone: {location_data.get('timezone')}")
        else:
            print("❌ Location detection failed - would use system timezone")
            system_tz = detector.get_system_timezone()
            print(f"   System timezone: {system_tz}")