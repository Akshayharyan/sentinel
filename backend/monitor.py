
import time
import httpx


def check_website(url: str) -> dict:
    start_time = time.perf_counter()

    try:
        response = httpx.get(
            url,
            timeout=10.0,
            follow_redirects=True
        )

        elapsed_time = (time.perf_counter() - start_time) * 1000

        return {
            "url": url,
            "status_code": response.status_code,
            "response_time_ms": round(elapsed_time, 2),
            "is_up": response.is_success
        }

    except httpx.HTTPError as error:
        elapsed_time = (time.perf_counter() - start_time) * 1000

        return {
            "url": url,
            "status_code": None,
            "response_time_ms": round(elapsed_time, 2),
            "is_up": False,
            "error": str(error)
        }
