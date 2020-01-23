var c = document.getElementById('content');
var h = "Tryck 'u' eller 'm'";
c.innerHTML = h;
var f = [];
function uppstallning() {
    var a = Math.floor(Math.random() * 1000);
    var b = Math.floor(Math.random() * 1000);
    var e = Math.max(a, b) + " - " + Math.min(a, b);
    f.push(e + " = " + (Math.max(a, b) - Math.min(a, b)));
    c.innerHTML = e;
}
function multiplikation() {
    var a = (Math.floor(Math.random() * 4)) + 2;
    var b = (Math.floor(Math.random() * 9)) + 2;
    var e = (Math.random() > 0.5) ? a + " \u00D7 " + b : b + " \u00D7 " + a;
    f.push(e + " = " + a * b);
    c.innerHTML = e;
}
function facit() {
    c.innerHTML = f.join("<br>");
    f = [];
}
window.addEventListener("keypress", function (e) {
    switch (e.key) {
        case 'u':
            uppstallning();
            break;
        case 'm':
            multiplikation();
            break;
        case 'f':
            facit();
            break;
        default:
            c.innerHTML = h;
            //c.innerHTML = e.key;
            break;
    }
});
document.getElementById('button-u').onclick = uppstallning;
document.getElementById('button-m').onclick = multiplikation;
document.getElementById('button-f').onclick = facit;
//# sourceMappingURL=index.js.map