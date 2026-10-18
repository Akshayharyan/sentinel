
def detect_transition(
    previous_is_up: list[bool],
    current_is_up: bool,
) -> str | None:
    """
    Detect when a website goes down or recovers.

    previous_is_up is ordered newest first.
    True means UP; False means DOWN.
    """

    # Was the website already confirmed DOWN?
    was_down = (
        len(previous_is_up) >= 2
        and previous_is_up[0] is False
        and previous_is_up[1] is False
    )

    if current_is_up is False:
        # Confirm downtime on the second consecutive failure.
        now_down = (
            bool(previous_is_up)
            and previous_is_up[0] is False
        )

        if now_down and not was_down:
            return "DOWN"

    elif was_down:
        # The website has recovered.
        return "RECOVERED"

    return None
