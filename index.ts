const c = document.getElementById('content');
const h = "Tryck 'u' eller 'm'";
c.innerHTML = h;

let f = [];

function uniformRandom(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

function biasedRandom(min: number, max: number, bias: number): number {
    while(max > min && Math.random() > bias){
        max--;
    }
    return max;
}

function biasedRandom2(values: number[], bias: number): number {
    for(let i = 0; i < values.length; i++){
        if(Math.random() < bias){
            return values[i];
        }
    }
    return values[values.length-1];
}


function uppstallning(){
    const a = uniformRandom(1, 999);
    const b = uniformRandom(1, 999);
    const e = `${Math.max(a,b)} - ${Math.min(a,b)}`;
    f.push(`${e} = ${Math.max(a,b) - Math.min(a,b)}`);
    c.innerHTML =  e;
}

function multiplikation(){
    //const a = biasedRandom2([8, 7, 4, 3, 5, 6, 2, 10, 1], .5);
    const a = biasedRandom2([4, 3, 5, 2, 1], .5);

    const b = uniformRandom(2, 10);
    const e = (Math.random() < 0.5) ? `${a} × ${b}` : `${b} × ${a}`;
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