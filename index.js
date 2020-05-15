var c = document.getElementById('content');
var h = "Tryck 'u' eller 'm'";
c.innerHTML = h;
var f = [];
function uniformRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}
function biasedRandom(min, max, bias) {
    while (max > min && Math.random() > bias) {
        max--;
    }
    return max;
}
function biasedRandom2(values, bias) {
    for (var i = 0; i < values.length; i++) {
        if (Math.random() < bias) {
            return values[i];
        }
    }
    return values[values.length - 1];
}
function uppstallning() {
    var a = uniformRandom(1, 999);
    var b = uniformRandom(1, 999);
    var e = Math.max(a, b) + " - " + Math.min(a, b);
    f.push(e + " = " + (Math.max(a, b) - Math.min(a, b)));
    c.innerHTML = e;
}
function multiplikation() {
    var a = biasedRandom2([8, 7, 4, 3, 5, 6, 2, 10, 1], .5);
    var b = uniformRandom(2, 10);
    var e = (Math.random() < 0.5) ? a + " \u00D7 " + b : b + " \u00D7 " + a;
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