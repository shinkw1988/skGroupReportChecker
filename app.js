// ========================================
// グループ報告チェッカー - アプリケーションロジック
// ========================================

// 状態管理
class AppState {
  constructor() {
    this.groupType = 'number'; // 'number' or 'alphabet'
    this.groupCount = 12;
    this.checks = {}; // { groupId: { checked: boolean, order: number|null, note: string } }
    this.checkOrder = 0; // 現在のチェック順序カウンター
    this.load();
  }

  // LocalStorageから読み込み
  load() {
    try {
      const saved = localStorage.getItem('groupCheckerState');
      if (saved) {
        const data = JSON.parse(saved);
        this.groupType = data.groupType || 'number';
        this.groupCount = data.groupCount || 12;
        this.checks = data.checks || {};
        this.checkOrder = data.checkOrder || 0;
      } else {
        this.initializeChecks();
      }
    } catch (error) {
      console.error('データの読み込みに失敗しました:', error);
      this.initializeChecks();
    }
  }

  // LocalStorageに保存
  save() {
    try {
      const data = {
        groupType: this.groupType,
        groupCount: this.groupCount,
        checks: this.checks,
        checkOrder: this.checkOrder
      };
      localStorage.setItem('groupCheckerState', JSON.stringify(data));
    } catch (error) {
      console.error('データの保存に失敗しました:', error);
    }
  }

  // チェック状態の初期化
  initializeChecks() {
    this.checks = {};
    for (let i = 1; i <= this.groupCount; i++) {
      this.checks[i] = {
        checked: false,
        order: null,
        note: ''
      };
    }
    this.checkOrder = 0;
  }

  // 班名を取得
  getGroupName(index) {
    if (this.groupType === 'number') {
      return `${index}班`;
    } else {
      // A班、B班...Z班、AA班、AB班...
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let name = '';
      let num = index - 1;

      while (num >= 0) {
        name = alphabet[num % 26] + name;
        num = Math.floor(num / 26) - 1;
      }

      return `${name}班`;
    }
  }

  // チェック状態をトグル
  toggleCheck(groupId) {
    const check = this.checks[groupId];
    if (check.checked) {
      // チェック解除
      check.checked = false;
      const oldOrder = check.order;
      check.order = null;

      // 他のチェック済みアイテムの順序を調整
      Object.keys(this.checks).forEach(id => {
        if (this.checks[id].order && this.checks[id].order > oldOrder) {
          this.checks[id].order--;
        }
      });

      this.checkOrder--;
    } else {
      // チェック
      check.checked = true;
      this.checkOrder++;
      check.order = this.checkOrder;
    }

    this.save();
  }

  // 全チェックをクリア
  clearAll() {
    Object.keys(this.checks).forEach(id => {
      this.checks[id].checked = false;
      this.checks[id].order = null;
    });
    this.checkOrder = 0;
    this.save();
  }

  // 備考を更新
  updateNote(groupId, note) {
    if (this.checks[groupId]) {
      this.checks[groupId].note = note;
      this.save();
    }
  }

  // 設定を更新
  updateSettings(groupType, groupCount) {
    const oldCount = this.groupCount;
    this.groupType = groupType;
    this.groupCount = groupCount;

    // 班の数が変更された場合、チェック状態を調整
    if (groupCount > oldCount) {
      // 増えた分を追加
      for (let i = oldCount + 1; i <= groupCount; i++) {
        this.checks[i] = {
          checked: false,
          order: null,
          note: ''
        };
      }
    } else if (groupCount < oldCount) {
      // 減った分を削除
      for (let i = groupCount + 1; i <= oldCount; i++) {
        delete this.checks[i];
      }
      // チェック順序を再計算
      this.recalculateOrder();
    }

    this.save();
  }

  // チェック順序を再計算
  recalculateOrder() {
    const checkedItems = [];
    Object.keys(this.checks).forEach(id => {
      if (this.checks[id].checked && this.checks[id].order) {
        checkedItems.push({ id, order: this.checks[id].order });
      }
    });

    // 順序でソート
    checkedItems.sort((a, b) => a.order - b.order);

    // 順序を再割り当て
    checkedItems.forEach((item, index) => {
      this.checks[item.id].order = index + 1;
    });

    this.checkOrder = checkedItems.length;
  }
}

// UI管理
class AppUI {
  constructor(state) {
    this.state = state;
    this.elements = {
      checkScreen: document.getElementById('checkScreen'),
      settingsScreen: document.getElementById('settingsScreen'),
      groupList: document.getElementById('groupList'),
      btnClearAll: document.getElementById('btnClearAll'),
      btnSettings: document.getElementById('btnSettings'),
      btnBack: document.getElementById('btnBack'),
      typeNumber: document.getElementById('typeNumber'),
      typeAlphabet: document.getElementById('typeAlphabet'),
      groupCount: document.getElementById('groupCount'),
      btnMinus: document.getElementById('btnMinus'),
      btnPlus: document.getElementById('btnPlus'),
      warningMessage: document.getElementById('warningMessage')
    };

    this.initEventListeners();
    this.renderGroupList();
  }

  // イベントリスナーの初期化
  initEventListeners() {
    // 選択解除ボタン
    this.elements.btnClearAll.addEventListener('click', () => {
      this.state.clearAll();
      this.renderGroupList();
    });

    // 設定ボタン
    this.elements.btnSettings.addEventListener('click', () => {
      this.showSettings();
    });

    // 戻るボタン
    this.elements.btnBack.addEventListener('click', () => {
      this.applySettings();
      this.showCheckScreen();
    });

    // 班タイプの変更
    this.elements.typeNumber.addEventListener('change', () => {
      this.hideWarning();
    });

    this.elements.typeAlphabet.addEventListener('change', () => {
      this.hideWarning();
    });

    // 班の数の変更
    this.elements.groupCount.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      if (value > 30) {
        this.showWarning();
        e.target.value = 30;
      } else {
        this.hideWarning();
      }
    });

    // マイナスボタン
    this.elements.btnMinus.addEventListener('click', () => {
      let value = parseInt(this.elements.groupCount.value);
      if (value > 1) {
        value--;
        this.elements.groupCount.value = value;
        this.hideWarning();
      }
    });

    // プラスボタン
    this.elements.btnPlus.addEventListener('click', () => {
      let value = parseInt(this.elements.groupCount.value);
      if (value < 30) {
        value++;
        this.elements.groupCount.value = value;
        this.hideWarning();
      } else {
        this.showWarning();
      }
    });
  }

  // グループリストをレンダリング
  renderGroupList() {
    this.elements.groupList.innerHTML = '';

    for (let i = 1; i <= this.state.groupCount; i++) {
      const check = this.state.checks[i];
      const groupItem = this.createGroupItem(i, check);
      this.elements.groupList.appendChild(groupItem);
    }
  }

  // グループアイテムを作成
  createGroupItem(groupId, check) {
    const item = document.createElement('div');
    item.className = `group-item ${check.checked ? 'checked' : ''}`;
    item.dataset.groupId = groupId;

    // 順番表示
    const orderNumber = document.createElement('div');
    orderNumber.className = `order-number ${check.order === 1 ? 'first' : ''}`;
    orderNumber.textContent = check.order || '';

    // 班名
    const groupName = document.createElement('div');
    groupName.className = 'group-name';
    groupName.textContent = this.state.getGroupName(groupId);

    // チェックボタン
    const btnCheck = document.createElement('button');
    btnCheck.className = 'btn-check';
    btnCheck.setAttribute('aria-label', `${this.state.getGroupName(groupId)}をチェック`);
    btnCheck.addEventListener('click', () => {
      this.state.toggleCheck(groupId);
      this.renderGroupList();
    });

    // 備考欄
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'note-input';
    noteInput.placeholder = '人数、班長名など';
    noteInput.value = check.note || '';
    noteInput.addEventListener('input', (e) => {
      this.state.updateNote(groupId, e.target.value);
    });

    item.appendChild(orderNumber);
    item.appendChild(groupName);
    item.appendChild(btnCheck);
    item.appendChild(noteInput);

    return item;
  }

  // チェック画面を表示
  showCheckScreen() {
    this.elements.checkScreen.classList.remove('hidden');
    this.elements.settingsScreen.classList.remove('active');
    this.renderGroupList();
  }

  // 設定画面を表示
  showSettings() {
    this.elements.checkScreen.classList.add('hidden');
    this.elements.settingsScreen.classList.add('active');

    // 現在の設定を反映
    if (this.state.groupType === 'number') {
      this.elements.typeNumber.checked = true;
    } else {
      this.elements.typeAlphabet.checked = true;
    }
    this.elements.groupCount.value = this.state.groupCount;
    this.hideWarning();
  }

  // 設定を適用
  applySettings() {
    const groupType = this.elements.typeNumber.checked ? 'number' : 'alphabet';
    const groupCount = parseInt(this.elements.groupCount.value);

    if (groupCount >= 1 && groupCount <= 30) {
      this.state.updateSettings(groupType, groupCount);
    }
  }

  // 警告メッセージを表示
  showWarning() {
    this.elements.warningMessage.classList.add('show');
  }

  // 警告メッセージを非表示
  hideWarning() {
    this.elements.warningMessage.classList.remove('show');
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  const state = new AppState();
  const ui = new AppUI(state);
});
