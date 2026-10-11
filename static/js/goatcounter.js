(() => {
    const endpoint = "https://teena-not-tina.goatcounter.com";
    const tracker = document.createElement("script");
    tracker.dataset.goatcounter = `${endpoint}/count`;
    tracker.async = true;
    tracker.src = "https://gc.zgo.at/count.js";
    document.head.append(tracker);

    const parts = new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const today = `${parts.find(({ type }) => type === "year").value}-${parts.find(({ type }) => type === "month").value}-${parts.find(({ type }) => type === "day").value}`;

    const showCounts = () => {
        fetch(`${endpoint}/counter/TOTAL.json?start=${today}`)
            .then((response) => response.json())
            .then(({ count }) => { document.getElementById("goatcounter-today").textContent = count; })
            .catch(() => {});
        fetch(`${endpoint}/counter/TOTAL.json`)
            .then((response) => response.json())
            .then(({ count }) => { document.getElementById("goatcounter-total").textContent = count; })
            .catch(() => {});
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showCounts, { once: true });
    } else {
        showCounts();
    }
})();
