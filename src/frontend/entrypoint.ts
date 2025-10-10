const button: Element | null = document.querySelector("#test-button");

if (button) {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    setTimeout(() => {
      alert("Button clicked!");
    }, 1000);
  });
}
