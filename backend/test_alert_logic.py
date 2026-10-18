
import unittest

from alert_logic import detect_transition


class TestAlertDetection(unittest.TestCase):

    def test_first_failure_does_not_confirm_downtime(self):
        self.assertIsNone(
            detect_transition([True], False)
        )

    def test_second_consecutive_failure_confirms_downtime(self):
        self.assertEqual(
            detect_transition([False], False),
            "DOWN",
        )

    def test_continued_downtime_does_not_repeat_alert(self):
        self.assertIsNone(
            detect_transition([False, False], False)
        )

    def test_success_after_confirmed_downtime_detects_recovery(self):
        self.assertEqual(
            detect_transition([False, False], True),
            "RECOVERED",
        )

    def test_one_failure_followed_by_success_is_not_recovery(self):
        self.assertIsNone(
            detect_transition([False, True], True)
        )

    def test_normal_operation_does_not_trigger_alert(self):
        self.assertIsNone(
            detect_transition([True, True], True)
        )


if __name__ == "__main__":
    unittest.main()
