"use strict";var Pro6PP=(()=>{var y=Object.defineProperty,H=Object.defineProperties,$=Object.getOwnPropertyDescriptor,F=Object.getOwnPropertyDescriptors,R=Object.getOwnPropertyNames,L=Object.getOwnPropertySymbols;var D=Object.prototype.hasOwnProperty,N=Object.prototype.propertyIsEnumerable;var T=(o,e,t)=>e in o?y(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t,f=(o,e)=>{for(var t in e||(e={}))D.call(e,t)&&T(o,t,e[t]);if(L)for(var t of L(e))N.call(e,t)&&T(o,t,e[t]);return o},m=(o,e)=>H(o,F(e));var B=(o,e)=>{for(var t in e)y(o,t,{get:e[t],enumerable:!0})},O=(o,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of R(e))!D.call(o,i)&&i!==t&&y(o,i,{get:()=>e[i],enumerable:!(n=$(e,i))||n.enumerable});return o};var U=o=>O(y({},"__esModule",{value:!0}),o);var J={};B(J,{InferJS:()=>S,attach:()=>Q});function M(o){return o.toLowerCase().trim()}function V(o){return o.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function P(o,e){let t=M(o),n=M(e);if(n.includes(" "))return t.indexOf(n);let r=new RegExp(`(?:^|[,\\s])${V(n)}(?:$|[,\\s])`,"g").exec(t);if(r){let s=r.index,a=t[s];return a===","||a===" "?s+1:s}return-1}function z(o,e){let t=[],n=[];e.street&&n.push({value:e.street,type:"street"}),e.city&&n.push({value:e.city,type:"city"}),e.postcode&&n.push({value:e.postcode,type:"postcode"}),e.street_number!==void 0&&e.street_number!==null&&n.push({value:String(e.street_number),type:"street_number"}),e.addition&&n.push({value:e.addition,type:"addition"});for(let i of n){let r=P(o,i.value);r!==-1&&t.push({type:i.type,value:i.value,position:r})}return t.sort((i,r)=>i.position-r.position),t}function _(o,e){if(!e||!o)return"";let t=z(o,e),n=new Set(t.map(s=>s.type)),i=[];for(let s of t)i.push(s.value);let r=["street","street_number","addition","postcode","city"];for(let s of r){if(n.has(s))continue;let a;switch(s){case"street":a=e.street;break;case"city":a=e.city;break;case"street_number":a=e.street_number!==void 0?String(e.street_number):void 0;break;case"postcode":a=e.postcode;break;case"addition":a=e.addition;break}a&&i.push(a)}return i.join(", ")}var b={API_URL:"https://api.pro6pp.nl/v2",LIMIT:20,DEBOUNCE_MS:150,MIN_DEBOUNCE_MS:50,MAX_RETRIES:0},C={DIGITS_1_3:/^[0-9]{1,3}$/,STREET_NUMBER_PREFIX:/^(\d+)\s*,\s*$/},A={query:"",stage:null,cities:[],streets:[],suggestions:[],isValid:!1,value:null,isError:!1,isLoading:!1,hasMore:!1,selectedSuggestionIndex:-1},v=class{constructor(e){this.abortController=null;this.isDestroyed=!1;this.country=e.country,this.authKey=e.authKey,this.explicitApiUrl=e.apiUrl,this.baseLimit=e.limit||b.LIMIT,this.currentLimit=this.baseLimit,this.language=e.language;let t=e.maxRetries!==void 0?e.maxRetries:b.MAX_RETRIES;this.maxRetries=Math.max(0,Math.min(t,10)),this.fetcher=e.fetcher||((r,s)=>fetch(r,s)),this.onStateChange=e.onStateChange||(()=>{}),this.onSelect=e.onSelect||(()=>{}),this.state=f({},A);let n=e.debounceMs!==void 0?e.debounceMs:b.DEBOUNCE_MS,i=Math.max(n,b.MIN_DEBOUNCE_MS);this.debouncedFetch=this.debounce(r=>this.executeFetch(r),i)}handleInput(e){if(this.isDestroyed)return;this.currentLimit=this.baseLimit;let t=this.state.stage==="final"&&e!==this.state.query;this.updateState({query:e,isValid:!1,value:null,isLoading:!!e.trim(),selectedSuggestionIndex:-1,hasMore:!1,stage:t?null:this.state.stage}),t&&this.onSelect(null),this.debouncedFetch(e)}loadMore(){this.isDestroyed||this.state.isLoading||(this.currentLimit+=this.baseLimit,this.updateState({isLoading:!0}),this.executeFetch(this.state.query))}handleKeyDown(e){if(this.isDestroyed)return;let t=e.target;if(!t)return;let n=this.state.cities.length+this.state.streets.length+this.state.suggestions.length;if(n>0){if(e.key==="ArrowDown"){e.preventDefault();let r=this.state.selectedSuggestionIndex+1;r>=n&&(r=0),this.updateState({selectedSuggestionIndex:r});return}if(e.key==="ArrowUp"){e.preventDefault();let r=this.state.selectedSuggestionIndex-1;r<0&&(r=n-1),this.updateState({selectedSuggestionIndex:r});return}if(e.key==="Enter"&&this.state.selectedSuggestionIndex>=0){e.preventDefault();let s=[...this.state.cities,...this.state.streets,...this.state.suggestions][this.state.selectedSuggestionIndex];s&&(this.selectItem(s),this.updateState({selectedSuggestionIndex:-1}));return}}let i=t.value;if(e.key===" "&&this.shouldAutoInsertComma(i)){e.preventDefault();let r=`${i.trim()}, `;this.updateQueryAndFetch(r)}}selectItem(e){if(this.isDestroyed)return!1;this.debouncedFetch.cancel(),this.abortController&&this.abortController.abort();let t=typeof e=="string"?e:e.label,n=t;typeof e!="string"&&typeof e.value=="string"&&(n=e.value);let i=typeof e!="string"&&typeof e.value=="object"?e.value:void 0,r=!!i&&Object.keys(i).length>0;if(this.state.stage==="final"||r){let a=t;if(i&&Object.keys(i).length>0){let{street:d,street_number:l,postcode:c,city:p,addition:h}=i;if(d&&l&&p){let g=h?` ${h}`:"",u=c?`${c}, `:"";a=`${d}, ${l}${g}, ${u}${p}`}}return this.finishSelection(a,i),!0}let s=typeof e!="string"?e.subtitle:null;return this.processSelection(n,s),!1}destroy(){var e;this.isDestroyed||(this.isDestroyed=!0,this.debouncedFetch.cancel(),(e=this.abortController)==null||e.abort(),this.abortController=null)}shouldAutoInsertComma(e){if(!e.includes(",")&&C.DIGITS_1_3.test(e.trim()))return!0;if(this.state.stage==="street_number"){let n=this.getCurrentFragment(e);return C.DIGITS_1_3.test(n)}return!1}finishSelection(e,t){this.updateState({query:e,suggestions:[],cities:[],streets:[],isValid:!0,value:t||null,stage:"final",hasMore:!1}),this.onSelect(t||e)}processSelection(e,t){let{stage:n,query:i}=this.state,r=i;if(t&&(n==="city"||n==="street"||n==="mixed")){if(n==="city")r=`${t}, ${e}, `;else{let l=this.getQueryPrefix(i),c=!l||!l.includes(t),p=l;if(l&&t){let h=l.match(C.STREET_NUMBER_PREFIX);if(h){let g=h[1];t.startsWith(g)&&(p="")}}c?r=p?`${p} ${e}, ${t}, `:`${e}, ${t}, `:r=p?`${p} ${e}, `:`${e}, `}this.updateQueryAndFetch(r);return}if(n==="direct"||n==="addition"){this.finishSelection(e);return}!i.includes(",")&&(n==="city"||n==="street"||n==="street_number_first")?r=`${e}, `:(r=this.replaceLastSegment(i,e),n!=="street_number"&&(r+=", ")),this.updateQueryAndFetch(r)}executeFetch(e,t=0){var l,c;if(this.isDestroyed)return;let n=(e||"").toString();if(!n.trim()){(l=this.abortController)==null||l.abort(),this.resetState();return}t===0&&(this.updateState({isError:!1}),this.abortController&&this.abortController.abort(),this.abortController=new AbortController);let i=(c=this.abortController)==null?void 0:c.signal,r=this.explicitApiUrl?this.explicitApiUrl:`${b.API_URL}/infer/${this.country.toLowerCase()}`,s=new URLSearchParams({query:n,limit:this.currentLimit.toString()});this.explicitApiUrl&&s.append("country",this.country.toLowerCase()),this.authKey&&s.set("authKey",this.authKey),this.language&&s.set("language",this.language);let a=r.includes("?")?"&":"?",d=`${r}${a}${s.toString()}`;this.fetcher(d,{signal:i}).then(p=>{if(!p.ok){if(t<this.maxRetries&&(p.status>=500||p.status===429))return this.retry(e,t,i);throw new Error("Network error")}return p.json()}).then(p=>{this.isDestroyed||i!=null&&i.aborted||p&&this.mapResponseToState(p)}).catch(p=>{if(!this.isDestroyed&&p.name!=="AbortError"){if(t<this.maxRetries)return this.retry(e,t,i);this.updateState({isError:!0,isLoading:!1})}})}retry(e,t,n){if(this.isDestroyed||n!=null&&n.aborted)return;let i=Math.pow(2,t)*200;setTimeout(()=>{!this.isDestroyed&&!(n!=null&&n.aborted)&&this.executeFetch(e,t+1)},i)}mapResponseToState(e){var a,d,l,c;let t={stage:e.stage,isLoading:!1},n=e.suggestions||[],i=[],r=new Set;for(let p of n){let h=`${p.label}|${p.subtitle||""}|${JSON.stringify(p.value||{})}`;if(!r.has(h)){r.add(h);let g=this.reformatSuggestionLabel(p);i.push(g)}}let s=i.length+(((a=e.cities)==null?void 0:a.length)||0)+(((d=e.streets)==null?void 0:d.length)||0);t.hasMore=s>=this.currentLimit,e.stage==="mixed"?(t.cities=e.cities||[],t.streets=e.streets||[],((l=t.cities)==null?void 0:l.length)===0&&((c=t.streets)==null?void 0:c.length)===0?t.suggestions=i:t.suggestions=[]):(t.suggestions=i,t.cities=[],t.streets=[]),t.isValid=e.stage==="final",this.updateState(t),t.isValid&&i.length===1&&this.selectItem(i[0])}reformatSuggestionLabel(e){if(!e.value||typeof e.value=="string")return e;let t=e.value;if(!t.street||!t.city)return e;let n=_(this.state.query,t);return n?m(f({},e),{label:n}):e}updateQueryAndFetch(e){this.updateState({query:e,suggestions:[],cities:[],streets:[],isValid:!1,value:null,isLoading:!0,hasMore:!1}),this.debouncedFetch(e)}replaceLastSegment(e,t){let n=e.lastIndexOf(",");return n===-1?t:`${e.slice(0,n+1)} ${t}`.trim()}getQueryPrefix(e){let t=e.lastIndexOf(",");return t===-1?"":e.slice(0,t+1).trimEnd()}getCurrentFragment(e){var t;return((t=e.split(",").slice(-1)[0])!=null?t:"").trim()}resetState(){this.updateState(m(f({},A),{query:this.state.query}))}updateState(e){this.isDestroyed||(this.state=f(f({},this.state),e),this.onStateChange(this.state))}debounce(e,t){let n,i=(...r)=>{n&&clearTimeout(n),n=setTimeout(()=>e.apply(this,r),t)};return i.cancel=()=>{n&&(clearTimeout(n),n=void 0)},i}};function q(o){if(o.length===0)return o;let e=[];for(let t of o){let n=e[e.length-1];n&&n.match===t.match?n.text+=t.text:e.push({text:t.text,match:t.match})}return e}function k(o,e){if(!e||!o)return[{text:o,match:!1}];let t=[],n=o.toLowerCase(),i=e.toLowerCase(),r=0,s=0;for(let l=0;l<o.length;l++){if(!(r<e.length&&n[l]===i[r]))continue;l>s&&t.push({text:o.slice(s,l),match:!1}),t.push({text:o[l],match:!0}),r++,s=l+1}return s<o.length&&t.push({text:o.slice(s),match:!1}),r===e.length?q(t):[{text:o,match:!1}]}var E=`
  .pro6pp-wrapper {
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  .pro6pp-wrapper * {
    box-sizing: border-box;
  }
  .pro6pp-input {
    width: 100%;
    padding: 12px 14px;
    padding-right: 48px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    line-height: 1.5;
    appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pro6pp-input::placeholder {
    font-size: 16px;
    color: #a3a3a3;
  }

  .pro6pp-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .pro6pp-input-addons {
    position: absolute;
    right: 4px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
  }
  .pro6pp-input-addons > * {
    pointer-events: auto;
  }

  .pro6pp-clear-button {
    background: none;
    border: none;
    width: 32px;
    height: 32px;
    cursor: pointer;
    color: #a3a3a3;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: color 0.2s, background-color 0.2s;
    touch-action: manipulation;
  }

  @media (hover: hover) {
    .pro6pp-clear-button:hover {
      color: #1f2937;
      background-color: #f3f4f6;
    }
  }

  .pro6pp-clear-button:active {
    background-color: #f3f4f6;
  }

  .pro6pp-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 9999;
    padding: 0;
    max-height: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  @media (max-height: 500px) {
    .pro6pp-dropdown {
      max-height: 180px;
    }
  }

  .pro6pp-list {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
  }

  .pro6pp-item {
    padding: 12px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 15px;
    line-height: 1.4;
    color: #374151;
    border-bottom: 1px solid #f3f4f6;
    transition: background-color 0.1s;
    flex-shrink: 0;
  }

  .pro6pp-item:last-child {
    border-bottom: none;
  }

  @media (hover: hover) {
    .pro6pp-item:hover, .pro6pp-item--active {
      background-color: #f9fafb;
    }
  }

  .pro6pp-item:active {
    background-color: #f3f4f6;
  }

  .pro6pp-item__label {
    font-weight: 400;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pro6pp-item__label--match {
    font-weight: 520;
  }

  .pro6pp-item__label--unmatched {
    font-weight: 400;
    color: #4b5563;
  }

  .pro6pp-item__subtitle {
    color: #6b7280;
    flex-shrink: 0;
  }

  .pro6pp-item__chevron {
    color: #d1d5db;
    display: flex;
    align-items: center;
    margin-left: auto;
    padding-left: 8px;
  }

  .pro6pp-no-results {
    padding: 24px 16px;
    color: #6b7280;
    font-size: 15px;
    text-align: center;
  }

  .pro6pp-loader-item {
    padding: 10px 12px;
    color: #6b7280;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: #f9fafb;
    border-top: 1px solid #f3f4f6;
  }

  .pro6pp-mini-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #e5e7eb;
    border-top-color: #6b7280;
    border-radius: 50%;
    animation: pro6pp-spin 0.6s linear infinite;
  }

  @media (max-width: 640px) {
    .pro6pp-input {
      font-size: 16px;
      padding: 10px 12px;
    }
    .pro6pp-item {
      padding: 10px 12px;
      font-size: 14px;
    }
  }

  @keyframes pro6pp-spin {
    to { transform: rotate(360deg); }
  }
`;var x=new WeakMap;function K(o){return x.get(o)}function j(o,...e){e.forEach(t=>x.set(t,o))}var S=class{constructor(e,t){this.isOpen=!1;this.boundHandlers=null;this.isDestroyed=!1;var s;let n=typeof e=="string"?document.querySelector(e):e;if(!n)throw new Error("InferJS: Target element not found.");let i=K(n);if(i&&i.destroy(),this.targetElement=n,this.ownsInput=!(n instanceof HTMLInputElement),this.noResultsText=t.noResultsText||"No results found",this.loadingText=t.loadingText||"Loading more...",this.showClearButton=t.showClearButton!==!1,this.useDefaultStyles=t.style!=="none",this.useDefaultStyles&&this.injectStyles(),this.wrapper=document.createElement("div"),this.wrapper.className="pro6pp-wrapper",n instanceof HTMLInputElement?(this.input=n,(s=this.input.parentNode)==null||s.insertBefore(this.wrapper,this.input),this.wrapper.appendChild(this.input)):(n.appendChild(this.wrapper),this.input=document.createElement("input"),this.input.type="text",t.placeholder&&(this.input.placeholder=t.placeholder),this.wrapper.appendChild(this.input)),this.input.setAttribute("autocomplete","off"),this.input.setAttribute("autocorrect","off"),this.input.setAttribute("autocapitalize","none"),this.input.setAttribute("spellcheck","false"),this.input.setAttribute("inputmode","search"),this.input.setAttribute("enterkeyhint","search"),this.input.classList.add("pro6pp-input"),t.inputClass){let a=t.inputClass.split(" ");this.input.classList.add(...a)}let r=document.createElement("div");r.className="pro6pp-input-addons",this.wrapper.appendChild(r),this.clearButton=document.createElement("button"),this.clearButton.type="button",this.clearButton.className="pro6pp-clear-button",this.clearButton.setAttribute("aria-label","Clear input"),this.clearButton.style.display="none",this.clearButton.innerHTML=`
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `,r.appendChild(this.clearButton),this.dropdown=document.createElement("div"),this.dropdown.className="pro6pp-dropdown",this.dropdown.style.display="none",this.wrapper.appendChild(this.dropdown),this.list=document.createElement("ul"),this.list.className="pro6pp-list",this.list.setAttribute("role","listbox"),this.dropdown.appendChild(this.list),this.dropdownLoader=document.createElement("div"),this.dropdownLoader.className="pro6pp-loader-item",this.dropdownLoader.style.display="none",this.dropdownLoader.innerHTML=`
      <div class="pro6pp-mini-spinner"></div>
      <span>${this.loadingText}</span>
    `,this.dropdown.appendChild(this.dropdownLoader),this.core=new v(m(f({},t),{onStateChange:a=>{this.render(a),t.onStateChange&&t.onStateChange(a)},onSelect:a=>{typeof a=="string"?this.input.value=a:a&&typeof a=="object"&&(this.input.value=this.core.state.query),t.onSelect&&t.onSelect(a)}})),this.observer=new IntersectionObserver(a=>{a[0].isIntersecting&&this.core.state.hasMore&&!this.core.state.isLoading&&this.core.loadMore()},{threshold:.1}),this.bindEvents(),j(this,this.targetElement,this.input)}get value(){return this.core.state.value||null}set value(e){if(!e)return;let t=e.addition?` ${e.addition}`:"",n=e.postcode?`${e.postcode}, `:"",i=`${e.street}, ${e.street_number}${t}, ${n}${e.city}`;this.core.selectItem({label:i,value:e})}destroy(){this.isDestroyed||(this.isDestroyed=!0,this.core.destroy(),this.boundHandlers&&(this.input.removeEventListener("input",this.boundHandlers.onInput),this.input.removeEventListener("keydown",this.boundHandlers.onKeyDown),this.clearButton.removeEventListener("click",this.boundHandlers.onClearClick),document.removeEventListener("mousedown",this.boundHandlers.onDocumentMouseDown),this.input.removeEventListener("focus",this.boundHandlers.onFocus),this.boundHandlers=null),this.observer.disconnect(),x.delete(this.targetElement),x.delete(this.input),this.wrapper.parentNode&&(this.ownsInput||this.wrapper.parentNode.insertBefore(this.input,this.wrapper),this.wrapper.remove()),this.input.classList.remove("pro6pp-input"),this.input.value="")}injectStyles(){let e="pro6pp-styles";if(!document.getElementById(e)){let t=document.createElement("style");t.id=e,t.textContent=E,document.head.appendChild(t)}}bindEvents(){this.boundHandlers={onInput:e=>{let t=e.target.value;this.isOpen=!0,this.core.handleInput(t)},onKeyDown:e=>{this.core.handleKeyDown(e)},onClearClick:()=>{this.core.handleInput(""),this.input.focus()},onDocumentMouseDown:e=>{this.wrapper.contains(e.target)||(this.isOpen=!1,this.dropdown.style.display="none")},onFocus:()=>{this.isOpen=!0,this.render(this.core.state)}},this.input.addEventListener("input",this.boundHandlers.onInput),this.input.addEventListener("keydown",this.boundHandlers.onKeyDown),this.clearButton.addEventListener("click",this.boundHandlers.onClearClick),document.addEventListener("mousedown",this.boundHandlers.onDocumentMouseDown),this.input.addEventListener("focus",this.boundHandlers.onFocus)}render(e){this.input.value!==e.query&&(this.input.value=e.query),this.showClearButton&&(this.clearButton.style.display=e.query.length>0?"flex":"none"),this.list.innerHTML="";let t=[...e.cities,...e.streets,...e.suggestions],n=t.length>0,i=!e.isLoading&&!e.isError&&e.query.length>0&&!n&&!e.isValid;if(!(this.isOpen&&(n||e.isLoading||i))){this.dropdown.style.display="none";return}if(this.dropdown.style.display="block",e.isLoading&&n?this.dropdownLoader.style.display="flex":this.dropdownLoader.style.display="none",e.isLoading&&!n){let s=document.createElement("li");s.className="pro6pp-no-results",s.textContent="Searching...",this.list.appendChild(s),this.dropdownLoader.style.display="none";return}if(i){let s=document.createElement("li");s.className="pro6pp-no-results",s.textContent=this.noResultsText,this.list.appendChild(s);return}if(t.forEach((s,a)=>{if(!s.label)return;let d=document.createElement("li");d.className="pro6pp-item",a===e.selectedSuggestionIndex&&d.classList.add("pro6pp-item--active"),d.setAttribute("role","option"),d.setAttribute("aria-selected",a===e.selectedSuggestionIndex?"true":"false");let l=document.createElement("span");l.className="pro6pp-item__label",k(s.label,e.query).forEach(({text:u,match:I})=>{let w=document.createElement("span");w.className=I?"pro6pp-item__label--match":"pro6pp-item__label--unmatched",w.textContent=u,l.appendChild(w)}),d.appendChild(l);let p=s.count!==void 0&&s.count!==null?s.count:"",h=s.subtitle||p;if(h!==""){let u=document.createElement("span");u.className="pro6pp-item__subtitle",u.textContent=`, ${h}`,d.appendChild(u)}if(s.value===void 0||s.value===null){let u=document.createElement("div");u.className="pro6pp-item__chevron",u.innerHTML=`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `,d.appendChild(u)}d.onmousedown=u=>u.preventDefault(),d.onclick=u=>{u.stopPropagation(),this.core.selectItem(s)?(this.isOpen=!1,this.dropdown.style.display="none"):setTimeout(()=>this.input.focus(),0)},this.list.appendChild(d)}),e.hasMore&&!e.isLoading){let s=document.createElement("li");s.style.height="1px",s.style.opacity="0",this.list.appendChild(s),this.observer.observe(s)}}};function Q(o,e){return new S(o,e)}return U(J);})();