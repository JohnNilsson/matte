const c = document.getElementById('content');
const h = "Tryck 'u' eller 'm'";
c.innerHTML = h;

let f = [];

function uppstallning(){
    const a = Math.floor(Math.random() * 1000);
    const b = Math.floor(Math.random() * 1000);
    const e = `${Math.max(a,b)} - ${Math.min(a,b)}`;
    f.push(`${e} = ${Math.max(a,b) - Math.min(a,b)}`);
    c.innerHTML =  e;
}

function multiplikation(){
    const a = (Math.floor(Math.random() * 4))+2;
    const b = (Math.floor(Math.random() * 9))+2;
    const e = (Math.random() > 0.5) ? `${a} × ${b}` : `${b} × ${a}`;
    f.push(`${e} = ${a * b}`);
    c.innerHTML = e;
}

function facit(){
    c.innerHTML = f.join("<br>");
    f = [];
}

window.addEventListener("keypress", e => {
    switch(e.key)
    {
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