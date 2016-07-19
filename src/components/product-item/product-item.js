import closest from 'closest';
import delegate from 'delegate';

let s;

let Product = {

  settings: {
    productList: document.querySelector('.js-product-list'),
    productSelector: '.js-product',
    productActionSelector: '.js-product-action',
    productCardClass: 'js-product-card',
    selectModifierClass: 'product--selected',
    preventHoverClass: 'is-not-hovered'
  },

  init() {
    s = this.settings;

    delegate(s.productList, s.productActionSelector, 'click', (e) => {
      this.toggleSelect(e.delegateTarget);
    }, false);
  },

  toggleSelect(target) {
    let elem = closest(target, s.productSelector, true);

    if (elem.classList.contains(s.selectModifierClass)) {
        elem.classList.remove(s.selectModifierClass);
        return;
    }

    if (target.classList.contains(s.productCardClass)) {
      this.preventHoverEffect(target);
    }

    elem.classList.add(s.selectModifierClass);
  },

  preventHoverEffect(target) {
    target.classList.add(s.preventHoverClass);

    target.addEventListener('mouseleave', (e) => {
      e.target.classList.remove(s.preventHoverClass);
    });
  }

};

export default Product;
