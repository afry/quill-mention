import './quill.mention.css';
import './blots/mention';
import Keys from './constants/keys';


class Mention {
  constructor(quill, options) {
    this.isOpen = false;
    this.itemIndex = 0;
    this.atPos = null;
    this.cursorPos = null;
    this.values = [];

    this.quill = quill;
    this.source = options.source;
    this.renderItem = options.renderItem;
    this.minChars = options.minChars || 0;
    this.maxChars = (options.maxChars || 30) + 1;
    this.allowedChars = options.allowedChars || /^[a-zA-Z0-9_]*$/;

    this.mentionList = document.createElement('ul');
    this.mentionList.className = 'ql-mention-list';

    this.mentionContainer = document.createElement('div');
    this.mentionContainer.className = 'ql-mention-list-container';
    this.mentionContainer.style.cssText = 'display: none; position: absolute;';
    this.mentionContainer.appendChild(this.mentionList)

    this.quill.container.appendChild(this.mentionContainer)

    quill.on('text-change', this.onTextChange.bind(this));
    quill.on('selection-change', this.onSelectionChange.bind(this));

    quill.keyboard.addBinding({
      key: Keys.TAB,
    }, this.selectHandler.bind(this));
    quill.keyboard.bindings[9].unshift(quill.keyboard.bindings[9].pop());

    quill.keyboard.addBinding({
      key: Keys.ENTER,
    }, this.selectHandler.bind(this));
    quill.keyboard.bindings[13].unshift(quill.keyboard.bindings[13].pop());

    quill.keyboard.addBinding({
      key: Keys.ESCAPE,
    }, this.escapeHandler.bind(this));

    quill.keyboard.addBinding({
      key: Keys.UP,
    }, this.upHandler.bind(this));

    quill.keyboard.addBinding({
      key: Keys.DOWN,
    }, this.downHandler.bind(this));
  }

  selectHandler() {
    if (this.isOpen) {
      this.selectItem();
      return false;
    }
    return true;
  }

  escapeHandler() {
    if (this.isOpen) {
      this.hideMentionList();
      return false;
    }
    return true;
  }

  upHandler() {
    if (this.isOpen) {
      this.prevItem();
      return false;
    }
    return true;
  }

  downHandler() {
    if (this.isOpen) {
      this.nextItem();
      return false;
    }
    return true;
  }

  showMentionList() {
    this.mentionContainer.style.display = '';
    this.isOpen = true;
  }

  hideMentionList() {
    this.mentionContainer.style.display = 'none';
    this.isOpen = false;
  }

  highlightItem() {
    for (let i = 0; i < this.mentionList.childNodes.length; i += 1) {
      this.mentionList.childNodes[i].classList.remove('selected');
    }
    this.mentionList.childNodes[this.itemIndex].classList.add('selected');
  }

  getItemData() {
    return {
      id: this.mentionList.childNodes[this.itemIndex].dataset.id,
      value: this.mentionList.childNodes[this.itemIndex].dataset.value,
    };
  }

  selectItem() {
    const data = this.getItemData();
    this.quill.deleteText(this.atPos, this.cursorPos - this.atPos, Quill.sources.API);
    this.quill.insertEmbed(this.atPos, 'mention', data, Quill.sources.API);
    this.quill.insertText(this.atPos + 1, ' ', Quill.sources.API);
    this.quill.setSelection(this.atPos + 2, Quill.sources.API);
    this.hideMentionList();
  }

  onItemClick(e) {
    e.stopImmediatePropagation();
    e.preventDefault();
    this.itemIndex = e.currentTarget.dataset.index;
    this.highlightItem();
    this.selectItem();
  }

  renderList(data, searchTerm) {
    if (data && data.length > 0) {
      this.values = data;
      this.mentionList.innerHTML = '';
      for (let i = 0; i < data.length; i += 1) {
        const li = document.createElement('li');
        li.className = 'ql-mention-list-item';
        li.dataset.index = i;
        li.dataset.id = data[i].id;
        li.dataset.value = data[i].value;
        li.innerHTML = this.renderItem(data[i], searchTerm);
        li.onclick = this.onItemClick.bind(this);
        this.mentionList.appendChild(li);
      }
      this.itemIndex = 0;
      this.highlightItem();
      this.showMentionList();
    } else {
      this.hideMentionList();
    }
  }

  nextItem() {
    this.itemIndex = (this.itemIndex + 1) % this.values.length;
    this.highlightItem();
  }

  prevItem() {
    this.itemIndex = ((this.itemIndex + this.values.length) - 1) % this.values.length;
    this.highlightItem();
  }

  hasValidChars(s) {
    return this.allowedChars.test(s);
  }

  setMentionListPosition(atSignIndex) {
    const atSignBounds = this.quill.getBounds(atSignIndex);

    if ((atSignBounds.left + 230) > this.quill.container.offsetWidth) {
      this.mentionContainer.style.left = 'auto';
      this.mentionContainer.style.right = 0;
    } else {
      this.mentionContainer.style.left = atSignBounds.left + 'px';
      this.mentionContainer.style.right = 'auto';
    }

    const windowHeight = window.innerHeight;
    const editorPos = this.quill.container.getBoundingClientRect().top;

    if (editorPos > windowHeight / 2) {
      this.mentionContainer.style.top = 'auto';
      this.mentionContainer.style.bottom = atSignBounds.top + atSignBounds.height + 15 + 'px';
    } else {
      this.mentionContainer.style.top = atSignBounds.top + atSignBounds.height + 15 + 'px';
      this.mentionContainer.style.bottom = 'auto';
    }
    this.mentionContainer.style.zIndex = 99;
  }

  onSomethingChange() {
    const range = this.quill.getSelection();
    if (range == null) return;
    this.cursorPos = range.index;
    const startPos = Math.max(0, this.cursorPos - this.maxChars);
    const beforeCursorPos = this.quill.getText(startPos, this.cursorPos - startPos);
    const atSignIndex = beforeCursorPos.lastIndexOf('@');
    if (atSignIndex > -1) {
      const atPos = this.cursorPos - (beforeCursorPos.length - atSignIndex);
      this.atPos = atPos;
      this.setMentionListPosition(atPos);
      const textAfterAtPos = beforeCursorPos.substring(atSignIndex + 1);
      if (textAfterAtPos.length >= this.minChars && this.hasValidChars(textAfterAtPos)) {
        this.source(textAfterAtPos);
      } else {
        this.hideMentionList();
      }
    } else {
      this.hideMentionList();
    }
  }

  onTextChange(delta, oldDelta, source) {
    if (source === 'user') {
      this.onSomethingChange();
    }
  }

  onSelectionChange(range) {
    if (range && range.length === 0) {
      this.onSomethingChange();
    } else {
      this.hideMentionList();
    }
  }
}

Quill.register('modules/mention', Mention);
