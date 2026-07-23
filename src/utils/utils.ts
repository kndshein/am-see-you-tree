// Calculate delay based on overview text
export function calculateDelay(overview_text: string) {
  return 0.1 + 0.3 * (overview_text.length / 200);
}

// https://stackoverflow.com/a/7557433
export function isElementInViewport(ele: HTMLElement) {
  var rect = ele.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight ||
        document.documentElement.clientHeight) /* or $(window).height() */ &&
    rect.right <=
      (window.innerWidth ||
        document.documentElement.clientWidth) /* or $(window).width() */
  );
}
