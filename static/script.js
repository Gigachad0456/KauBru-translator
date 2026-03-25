function translateWord() {
    let word = document.getElementById("word").value;
    let direction = document.getElementById("direction").value;

    document.getElementById("result").innerText = "Translating...";

    // If sentence (more than 1 word)
    if (word.includes(" ")) {
        fetch(`/translate/sentence?text=${encodeURIComponent(word)}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("result").innerText = data.translated;
        });
    } else {
        fetch(`/translate/${direction}?word=${encodeURIComponent(word)}`)
        .then(res => res.json())
        .then(data => {
            if (data.reang || data.english) {
                document.getElementById("result").innerText = data.reang || data.english;
            } else {
                document.getElementById("result").innerText = data.error;
            }
        });
    }
}

document.getElementById("word").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        translateWord();
    }
});