
const fetch = require('node-fetch');

async function test() {
    // Test a move known to have changes, e.g. "Stomp" or physical/special split related?
    // Actually "Flamethrower" changed in Gen 6 (X/Y).
    const res = await fetch('https://pokeapi.co/api/v2/move/flamethrower');
    const data = await res.json();
    console.log("Move: " + data.name);
    console.log("Past Values count: " + data.past_values.length);
    data.past_values.forEach(pv => {
        console.log("--- Version: " + pv.version_group.name + " ---");
        console.log(JSON.stringify(pv, null, 2));
    });
}

test();
