const products = [
  { id: 'camiseta', category: 'CAMISETA', name: 'CAMISETA DRY-FIT VAMOO CORE', price: 149.90, image: 'camisa_baisca.jpg' },
  { id: 'regata', category: 'REGATA', name: 'REGATA PERFORMANCE VAMOO RUN', price: 129.90, image: 'regata.jpg' },
  { id: 'shorts', category: 'SHORTS', name: 'SHORTS 2 EM 1 VAMOO SPLIT', price: 189.90, image: 'calcao.jpg' },
  { id: 'jaqueta', category: 'JAQUETA', name: 'CORTA-VENTO VAMOO STORM', price: 349.90, image: 'jaqueta.jpg' },
  { id: 'moletom', category: 'MOLETOM', name: 'MOLETOM OVERSIZED VAMOO CLUB', price: 279.90, image: 'moletom.jpg' },
  { id: 'legging', category: 'LEGGING', name: 'LEGGING COMPRESSÃO VAMOO MOVE', price: 199.90, image: 'laggy.jpg' },
  { id: 'bone', category: 'ACESSÓRIO', name: 'BONÉ TRUCKER VAMOO ORANGE', price: 99.90, image: 'bone.jpg' },
  { id: 'meias', category: 'ACESSÓRIO', name: 'KIT 3 MEIAS VAMOO CANO MÉDIO', price: 79.90, image: 'meia.jpg' },
];

let cart = JSON.parse(localStorage.getItem('vamoo-cart') || '[]');
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const imagePath = product => `assets/products/${product.image}`;
// Ative novamente quando a chave PIX e o checkout estiverem prontos para produção.
const PIX_ENABLED = false;

function productCard(product) {
  return `<article class="product-card"><div class="product-image"><img src="${imagePath(product)}" alt="${product.name}" /></div><div class="product-info"><p class="eyebrow">${product.category}</p><h3>${product.name}</h3><p>${money.format(product.price)}</p><button class="add-product" data-id="${product.id}" aria-label="Ver ${product.name}">+</button></div></article>`;
}

document.querySelector('.featured-products')?.append(...products.slice(0, 3).map(p => { const wrap = document.createElement('div'); wrap.innerHTML = productCard(p); return wrap.firstElementChild; }));
document.querySelector('.all-products')?.append(...products.map(p => { const wrap = document.createElement('div'); wrap.innerHTML = productCard(p); return wrap.firstElementChild; }));

document.addEventListener('click', event => {
  const add = event.target.closest('.add-product');
  if (add) window.location.href = `produto.html?id=${encodeURIComponent(add.dataset.id)}`;
});

function saveCart() { localStorage.setItem('vamoo-cart', JSON.stringify(cart)); renderCart(); }
function addToCart(id, size = 'P') { const existing = cart.find(item => item.id === id && (item.size || 'P') === size); existing ? existing.quantity++ : cart.push({ id, size, quantity: 1 }); saveCart(); openDrawer(); }
function total() { return cart.reduce((sum, item) => sum + products.find(p => p.id === item.id).price * item.quantity, 0); }
function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; el.hidden = !count; });
  document.querySelectorAll('.cart-subtitle').forEach(el => el.textContent = count ? `${count} ${count === 1 ? 'item pronto' : 'itens prontos'} pra ir com você.` : 'Sua sacola está vazia.');
  document.querySelectorAll('.cart-items').forEach(container => {
    container.innerHTML = cart.map(item => { const p = products.find(product => product.id === item.id); const size = item.size || 'P'; return `<div class="cart-item"><div class="cart-thumb"><img src="${imagePath(p)}" alt="${p.name}"/></div><div class="cart-item-data"><h3>${p.name}</h3><small>TAMANHO ${size}</small><p>${money.format(p.price)}</p><div class="quantity"><button data-action="minus" data-id="${p.id}" data-size="${size}" aria-label="Diminuir">−</button><span>${item.quantity}</span><button data-action="plus" data-id="${p.id}" data-size="${size}" aria-label="Aumentar">+</button></div></div><button class="remove-item" data-action="remove" data-id="${p.id}" data-size="${size}" aria-label="Remover item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></div>`; }).join('');
  });
  document.querySelectorAll('.subtotal strong').forEach(el => el.textContent = money.format(total()));
  document.querySelectorAll('.checkout-button').forEach(btn => btn.disabled = !cart.length);
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const item = cart.find(entry => entry.id === button.dataset.id && (entry.size || 'P') === (button.dataset.size || 'P')); if (!item) return;
  if (button.dataset.action === 'plus') item.quantity++;
  if (button.dataset.action === 'minus') item.quantity--;
  if (button.dataset.action === 'remove' || item.quantity <= 0) cart = cart.filter(entry => !(entry.id === item.id && (entry.size || 'P') === (item.size || 'P')));
  saveCart();
});

const drawer = document.querySelector('.cart-drawer'), backdrop = document.querySelector('.drawer-backdrop');
function openDrawer() { drawer?.classList.add('open'); backdrop?.classList.add('open'); }
function closeDrawer() { drawer?.classList.remove('open'); backdrop?.classList.remove('open'); }
document.querySelectorAll('.bag-button').forEach(button => button.addEventListener('click', openDrawer));
document.querySelectorAll('.close-drawer, .drawer-backdrop').forEach(button => button.addEventListener('click', closeDrawer));

document.querySelectorAll('.checkout-button').forEach(button => button.addEventListener('click', async () => {
  if (!cart.length) return;
  const dialog = document.querySelector('.pix-dialog'); const status = dialog.querySelector('.pix-status');
  dialog.showModal(); dialog.querySelector('.pix-qr').removeAttribute('src');
  if (!PIX_ENABLED) {
    status.textContent = 'O pagamento por PIX estará disponível em breve.';
    dialog.querySelector('.copy-pix').hidden = true;
    return;
  }
  dialog.querySelector('.copy-pix').hidden = false;
  status.textContent = 'Gerando seu QR Code PIX…';
  /* Geração PIX desativada temporariamente.
  try {
    const response = await fetch('/api/pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: total(), transactionId: `VAMOO${Date.now()}` }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    dialog.querySelector('.pix-qr').src = result.qrCode; dialog.querySelector('.copy-pix').dataset.payload = result.payload; status.textContent = `Total: ${money.format(total())}`;
  } catch (error) { status.textContent = error.message || 'Não foi possível gerar o PIX.'; }
  */
}));
document.querySelectorAll('.close-pix').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('.copy-pix').forEach(button => button.addEventListener('click', async () => { if (button.dataset.payload) { await navigator.clipboard.writeText(button.dataset.payload); button.textContent = 'Código PIX copiado!'; setTimeout(() => button.textContent = 'Copiar código PIX', 1800); } }));

const detail = document.querySelector('.product-detail');
if (detail) {
  const id = new URLSearchParams(window.location.search).get('id');
  const product = products.find(item => item.id === id) || products[0];
  detail.innerHTML = `<a class="back-link" href="loja.html">← LOJA</a><section class="product-detail-grid"><div class="detail-image"><img src="${imagePath(product)}" alt="${product.name}" /></div><div class="detail-copy"><p class="eyebrow">${product.category}</p><h1>${product.name}</h1><strong class="detail-price">${money.format(product.price)}</strong><p class="detail-description">${description(product)}</p><div class="size-wrap"><span>TAMANHO</span><div class="sizes"><button class="selected">P</button><button>M</button><button>G</button><button>GG</button></div></div><button class="button solid detail-add" data-id="${product.id}">Adicionar à sacola</button><ul class="product-benefits"><li>▱ &nbsp; Envio para todo o Brasil</li><li>↩ &nbsp; 30 dias para troca ou devolução</li><li>♢ &nbsp; Checkout seguro</li></ul></div></section>`;
  detail.addEventListener('click', event => {
    const size = event.target.closest('.sizes button');
    if (size) { detail.querySelectorAll('.sizes button').forEach(button => button.classList.remove('selected')); size.classList.add('selected'); }
    const add = event.target.closest('.detail-add'); if (add) addToCart(add.dataset.id, detail.querySelector('.sizes .selected').textContent);
  });
}
function description(product) {
  const descriptions = { camiseta: 'A base de todo treino. Malha dry-fit leve com toque seco, gola reforçada e costura plana que não incomoda nos quilômetros longos. Preta, discreta, pronta pra tudo.', regata: 'Leve, respirável e feita para acompanhar cada quilômetro. A regata Performance Vamoo Run mantém você em movimento.', shorts: 'Shorts 2 em 1 com mobilidade, leveza e suporte para o seu corre. Feito para treinos que vão mais longe.', jaqueta: 'Corta-vento leve e resistente para encarar clima instável sem perder o ritmo.', moletom: 'Conforto oversized para antes, durante e depois do treino. O uniforme do clube fora da pista.', legging: 'Compressão confortável e tecido que acompanha cada movimento. Para treinar sem limites.', bone: 'Boné trucker com aba curva e acabamento laranja Vamoo. Proteção para ir mais longe.', meias: 'Kit com três pares de meias de cano médio, reforçadas para acompanhar sua rotina.' };
  return descriptions[product.id];
}
renderCart();
