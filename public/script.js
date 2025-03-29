document.addEventListener("DOMContentLoaded", function () {
    const bst2Image = document.querySelector(".bst2");

    function handleScroll() {
        const position = bst2Image.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        if (position < windowHeight - 50) {
            bst2Image.style.opacity = "1";
            bst2Image.style.transform = "translateY(0)";
        }
    }

    bst2Image.style.opacity = "0";
    bst2Image.style.transform = "translateY(50px)";
    bst2Image.style.transition = "opacity 1s ease-out, transform 1s ease-out";

    window.addEventListener("scroll", handleScroll);
});
