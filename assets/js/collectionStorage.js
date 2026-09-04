const CollectionStorage = {
  STORAGE_KEY: "my_tcg_collection",

  _getCollection: function () {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading collection from localStorage", e);
      return [];
    }
  },

  _saveCollection: function (collectionArray) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(collectionArray));
    } catch (e) {
      console.error("Error saving collection to localStorage", e);
    }
  },

  /**
   * Obtiene la colección completa (un array de IDs de cartas).
   */
  getCollection: function () {
    return this._getCollection();
  },

  /**
   * Comprueba si el usuario tiene una carta específica en su colección.
   * @param {string} cardId 
   * @returns {boolean}
   */
  hasCard: function (cardId) {
    const col = this._getCollection();
    return col.includes(cardId);
  },

  /**
   * Añade una carta a la colección si no está presente.
   * @param {string} cardId 
   */
  addCard: function (cardId) {
    const col = this._getCollection();
    if (!col.includes(cardId)) {
      col.push(cardId);
      this._saveCollection(col);
    }
  },

  /**
   * Elimina una carta de la colección si está presente.
   * @param {string} cardId 
   */
  removeCard: function (cardId) {
    let col = this._getCollection();
    if (col.includes(cardId)) {
      col = col.filter((id) => id !== cardId);
      this._saveCollection(col);
    }
  },

  /**
   * Alterna el estado de una carta (la añade si no la tiene, la elimina si ya la tiene).
   * @param {string} cardId 
   * @returns {boolean} true si se añadió, false si se eliminó.
   */
  toggleCard: function (cardId) {
    if (this.hasCard(cardId)) {
      this.removeCard(cardId);
      return false;
    } else {
      this.addCard(cardId);
      return true;
    }
  }
};

window.CollectionStorage = CollectionStorage;
