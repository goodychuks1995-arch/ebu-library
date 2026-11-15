import "./cart.css";

const money = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString("en-NG")}`;

export default function CartDrawer({ open, items, busy, onClose, onRemove, onClear, onCheckout }) {
  if (!open) return null;
  const total = items.reduce((sum, item) => sum + Number(item.price_kobo || 0), 0);
  return (
    <div className="cart-overlay" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()} aria-label="Shopping cart">
        <div className="cart-head">
          <h2>Your cart</h2>
          <button className="cart-close" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>
        {items.length ? (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{money(item.price_kobo)}</span>
                  </div>
                  <button className="cart-remove" onClick={() => onRemove(item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="cart-foot">
              <div className="cart-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              <button className="cart-pay" onClick={onCheckout} disabled={busy}>
                {busy ? "Please wait..." : `Pay ${money(total)}`}
              </button>
              <button className="cart-clear" onClick={onClear}>
                Clear cart
              </button>
            </div>
          </>
        ) : (
          <p className="cart-empty">Your cart is empty. Add notes from the collection.</p>
        )}
      </aside>
    </div>
  );
}
