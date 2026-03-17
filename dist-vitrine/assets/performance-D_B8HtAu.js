const i=(t,o=300)=>{let e;return function(...u){const c=()=>{clearTimeout(e),t(...u)};clearTimeout(e),e=setTimeout(c,o)}};export{i as d};
