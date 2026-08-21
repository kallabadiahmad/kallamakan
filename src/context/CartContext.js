'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS, SHIPPING_METHODS, PROMO_VOUCHERS, CONFIG } from '../lib/constants';

const CartContext = createContext();

export function CartProvider({ children }) {
  // Products & Settings cached in localStorage for instant rendering, synced with MongoDB
  const [products, setProductsState] = useLocalStorage(CONFIG.STORAGE_KEYS.products, DEFAULT_PRODUCTS);
  const [settings, setSettingsState] = useLocalStorage(CONFIG.STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [orders, setOrdersState] = useLocalStorage(CONFIG.STORAGE_KEYS.orders, []);
  const [expenses, setExpensesState] = useLocalStorage(CONFIG.STORAGE_KEYS.expenses, []);

  // Cart Items: array of { id, productId, name, size, price, hpp, emoji, qty }
  const [cartItems, setCartItems] = useLocalStorage(CONFIG.STORAGE_KEYS.cart, []);

  // Shipping & Voucher
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Fetch initial data from MongoDB API
  const refreshAllData = useCallback(async () => {
    setIsLoadingDb(true);
    try {
      // Products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success && Array.isArray(prodData.products) && prodData.products.length > 0) {
          setProductsState(prodData.products);
        }
      }

      // Settings
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setJson = await setRes.json();
        if (setJson.success && setJson.settings) {
          setSettingsState(setJson.settings);
        }
      }

      // Orders
      const ordRes = await fetch('/api/orders');
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (ordData.success && Array.isArray(ordData.orders)) {
          setOrdersState(ordData.orders);
        }
      }

      // Expenses
      const expRes = await fetch('/api/expenses');
      if (expRes.ok) {
        const expData = await expRes.json();
        if (expData.success && Array.isArray(expData.expenses)) {
          setExpensesState(expData.expenses);
        }
      }
    } catch (err) {
      console.warn('MongoDB API sync error, fallback to local storage cache:', err);
    } finally {
      setIsLoadingDb(false);
    }
  }, [setProductsState, setSettingsState, setOrdersState, setExpensesState]);

  useEffect(() => {
    refreshAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MongoDB Sync Helpers

  // --- PRODUCTS ---
  const setProducts = async (value) => {
    let nextValue;
    if (typeof value === 'function') {
      nextValue = value(products);
    } else {
      nextValue = value;
    }
    setProductsState(nextValue);
  };

  const saveProduct = async (product) => {
    setProductsState((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = product;
        return updated;
      }
      return [...prev, product];
    });

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
    } catch (e) {
      console.error('Failed to sync product to MongoDB:', e);
    }
  };

  const deleteProduct = async (id) => {
    setProductsState((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete product from MongoDB:', e);
    }
  };

  // --- ORDERS ---
  const setOrders = async (value) => {
    let nextValue;
    if (typeof value === 'function') {
      nextValue = value(orders);
    } else {
      nextValue = value;
    }
    setOrdersState(nextValue);
  };

  const saveOrder = async (order) => {
    setOrdersState((prev) => [order, ...(prev || []).filter((o) => o.id !== order.id)]);
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch (e) {
      console.error('Failed to save order to MongoDB:', e);
    }
  };

  const updateOrderStatus = async (id, status) => {
    setOrdersState((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch (e) {
      console.error('Failed to update order status in MongoDB:', e);
    }
  };

  const deleteOrder = async (id) => {
    setOrdersState((prev) => prev.filter((o) => o.id !== id));
    try {
      await fetch(`/api/orders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete order from MongoDB:', e);
    }
  };

  // --- EXPENSES ---
  const setExpenses = async (value) => {
    let nextValue;
    if (typeof value === 'function') {
      nextValue = value(expenses);
    } else {
      nextValue = value;
    }
    setExpensesState(nextValue);
  };

  const saveExpense = async (expense) => {
    setExpensesState((prev) => [expense, ...(prev || []).filter((e) => e.id !== expense.id)]);
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
    } catch (e) {
      console.error('Failed to save expense to MongoDB:', e);
    }
  };

  const deleteExpense = async (id) => {
    setExpensesState((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete expense from MongoDB:', e);
    }
  };

  // --- SETTINGS ---
  const setSettings = async (value) => {
    let nextValue;
    if (typeof value === 'function') {
      nextValue = value(settings);
    } else {
      nextValue = value;
    }
    setSettingsState(nextValue);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextValue),
      });
    } catch (e) {
      console.error('Failed to save settings to MongoDB:', e);
    }
  };

  const saveSettings = async (newSettings) => {
    return setSettings(newSettings);
  };

  // Cart Operations
  const addToCart = (product, variant) => {
    const chosenVariant = variant || (product.variants && product.variants[0]) || {
      id: 'default',
      size: product.size || 'Reguler',
      price: product.price,
      hpp: product.hpp || 0,
    };
    const cartItemId = `${product.id}-${chosenVariant.id || chosenVariant.size}`;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: cartItemId,
            productId: product.id,
            name: product.name,
            size: chosenVariant.size,
            price: chosenVariant.price,
            hpp: chosenVariant.hpp || Math.round(chosenVariant.price * 0.5),
            emoji: product.emoji || '🥒',
            qty: 1,
          },
        ];
      }
    });
  };

  const removeFromCart = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCartItems((prev) =>
        prev.map((item) => (item.id === cartItemId ? { ...item, qty: newQty } : item))
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedVoucher(null);
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalHPP = cartItems.reduce((acc, item) => acc + (item.hpp || 0) * item.qty, 0);
  const itemCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  // Voucher apply logic
  const applyVoucher = (code) => {
    if (!code) return { success: false, message: 'Masukkan kode voucher' };
    const trimmed = code.trim().toUpperCase();
    const found = PROMO_VOUCHERS.find((v) => v.code === trimmed);

    if (!found) {
      return { success: false, message: 'Kode voucher tidak valid' };
    }

    if (subtotal < found.minOrder) {
      return {
        success: false,
        message: `Minimal belanja Rp ${found.minOrder.toLocaleString('id-ID')} untuk voucher ini`,
      };
    }

    setAppliedVoucher(found);
    return { success: true, message: `Voucher ${found.code} berhasil dipasang!` };
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  useEffect(() => {
    if (appliedVoucher && subtotal < appliedVoucher.minOrder) {
      setAppliedVoucher(null);
    }
  }, [subtotal, appliedVoucher]);

  const discount = appliedVoucher ? appliedVoucher.discount : 0;
  const shippingCost = selectedShipping ? selectedShipping.price : 0;
  const total = Math.max(0, subtotal + shippingCost - discount);
  const grossProfit = Math.max(0, subtotal - totalHPP - discount);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        products,
        setProducts,
        saveProduct,
        deleteProduct,
        settings,
        setSettings,
        saveSettings,
        orders,
        setOrders,
        saveOrder,
        updateOrderStatus,
        deleteOrder,
        expenses,
        setExpenses,
        saveExpense,
        deleteExpense,
        selectedShipping,
        setSelectedShipping,
        appliedVoucher,
        applyVoucher,
        removeVoucher,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        totalHPP,
        grossProfit,
        itemCount,
        shippingCost,
        discount,
        total,
        isCartOpen,
        setIsCartOpen,
        isLoadingDb,
        refreshAllData,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
