import Quill from "quill";
import Keys from "./constants";
import {
  attachDataValues,
  getMentionCharIndex,
  hasValidChars,
  hasValidMentionCharIndex
} from "./utils";
import "./quill.mention.css";
import "./blots/mention";

class Mention {
  constructor(quill, options) {
    this.isOpen = false;
    this.itemIndex = 0;
    this.mentionCharPos = null;
    this.cursorPos = null;
    this.values = [];
    this.suspendMouseEnter = false;

    this.quill = quill;

    this.options = {
      source: null,
      renderItem(item) {
        return `${item.value}`;
      },
      onSelect(item, insertItem) {
        insertItem(item);
      },
      mentionDenotationChars: ["@"],
      showDenotationChar: true,
      allowedChars: /^[a-zA-Z0-9_]*$/,
      minChars: 0,
      maxChars: 31,
      offsetTop: 2,
      offsetLeft: 0,
      isolateCharacter: false,
      fixMentionsToQuill: false,
      defaultMenuOrientation: "bottom",
      blotName: "mention",
      dataAttributes: ["id", "value", "denotationChar", "link", "target"],
      linkTarget: "_blank",
      onOpen() {
        return true;
      },
      onClose() {
        return true;
      },
      // Style options
      listItemClass: "ql-mention-list-item",
      mentionContainerClass: "ql-mention-list-container",
      mentionListClass: "ql-mention-list",
      spaceAfterInsert: true
    };

    Object.assign(this.options, options, {
      dataAttributes: Array.isArray(options.dataAttributes)
        ? this.options.dataAttributes.concat(options.dataAttributes)
        : this.options.dataAttributes
    });

    this.mentionContainer = document.createElement("div");
    this.mentionContainer.className = this.options.mentionContainerClass
      ? this.options.mentionContainerClass
      : "";
    this.mentionContainer.style.cssText = "display: none; position: absolute;";
    this.mentionContainer.onmousemove = this.onContainerMouseMove.bind(this);

    if (this.options.fixMentionsToQuill) {
      this.mentionContainer.style.width = "auto";
    }

    this.mentionList = document.createElement("ul");
    this.mentionList.className = this.options.mentionListClass
      ? this.options.mentionListClass
      : "";
    this.mentionContainer.appendChild(this.mentionList);

    this.quill.container.appendChild(this.mentionContainer);

    quill.on("text-change", this.onTextChange.bind(this));
    quill.on("selection-change", this.onSelectionChange.bind(this));

    quill.keyboard.addBinding(
      {
        key: Keys.TAB
      },
      this.selectHandler.bind(this)
    );
    quill.keyboard.bindings[Keys.TAB].unshift(
      quill.keyboard.bindings[Keys.TAB].pop()
    );

    quill.keyboard.addBinding(
      {
        key: Keys.ENTER
      },
      this.selectHandler.bind(this)
    );
    quill.keyboard.bindings[Keys.ENTER].unshift(
      quill.keyboard.bindings[Keys.ENTER].pop()
    );

    quill.keyboard.addBinding(
      {
        key: Keys.ESCAPE
      },
      this.escapeHandler.bind(this)
    );

    quill.keyboard.addBinding(
      {
        key: Keys.UP
      },
      this.upHandler.bind(this)
    );

    quill.keyboard.addBinding(
      {
        key: Keys.DOWN
      },
      this.downHandler.bind(this)
    );
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
    this.mentionContainer.style.visibility = "hidden";
    this.mentionContainer.style.display = "";
    this.setMentionContainerPosition();
    this.setIsOpen(true);
  }

  hideMentionList() {
    this.mentionContainer.style.display = "none";
    this.setIsOpen(false);
  }

  highlightItem(scrollItemInView = true) {
    for (let i = 0; i < this.mentionList.childNodes.length; i += 1) {
      this.mentionList.childNodes[i].classList.remove("selected");
    }
    this.mentionList.childNodes[this.itemIndex].classList.add("selected");

    if (scrollItemInView) {
      const itemHeight = this.mentionList.childNodes[this.itemIndex]
        .offsetHeight;
      const itemPos = this.itemIndex * itemHeight;
      const containerTop = this.mentionContainer.scrollTop;
      const containerBottom = containerTop + this.mentionContainer.offsetHeight;

      if (itemPos < containerTop) {
        // Scroll up if the item is above the top of the container
        this.mentionContainer.scrollTop = itemPos;
      } else if (itemPos > containerBottom - itemHeight) {
        // scroll down if any part of the element is below the bottom of the container
        this.mentionContainer.scrollTop +=
          itemPos - containerBottom + itemHeight;
      }
    }
  }

  getItemData() {
    const { link } = this.mentionList.childNodes[this.itemIndex].dataset;
    const hasLinkValue = typeof link !== "undefined";
    const itemTarget = this.mentionList.childNodes[this.itemIndex].dataset
      .target;
    if (hasLinkValue) {
      this.mentionList.childNodes[
        this.itemIndex
      ].dataset.value = `<a href="${link}" target=${itemTarget ||
        this.options.linkTarget}>${
        this.mentionList.childNodes[this.itemIndex].dataset.value
      }`;
    }
    return this.mentionList.childNodes[this.itemIndex].dataset;
  }

  onContainerMouseMove() {
    this.suspendMouseEnter = false;
  }

  selectItem() {
    const data = this.getItemData();
    this.options.onSelect(data, (asyncData, blotName = this.options.blotName) => {
      this.insertItem(asyncData, blotName);
    });
    this.hideMentionList();
  }

  insertItem(data, blotName = this.options.blotName) {
    const render = data;
    if (render === null) {
      return;
    }
    if (!this.options.showDenotationChar) {
      render.denotationChar = "";
    }

    const prevMentionCharPos = this.mentionCharPos;

    this.quill.deleteText(
      this.mentionCharPos,
      this.cursorPos - this.mentionCharPos,
      Quill.sources.USER
    );
    this.quill.insertEmbed(
      prevMentionCharPos,
      blotName,
      render,
      Quill.sources.USER
    );
    if (this.options.spaceAfterInsert) {
      this.quill.insertText(prevMentionCharPos + 1, " ", Quill.sources.USER);
      // setSelection here sets cursor position
      this.quill.setSelection(prevMentionCharPos + 2, Quill.sources.USER);
    } else {
      this.quill.setSelection(prevMentionCharPos + 1, Quill.sources.USER);
    }
    this.hideMentionList();
  }

  onItemMouseEnter(e) {
    if (this.suspendMouseEnter) {
      return;
    }

    const index = Number(e.target.dataset.index);

    if (!Number.isNaN(index) && index !== this.itemIndex) {
      this.itemIndex = index;
      this.highlightItem(false);
    }
  }

  onItemClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    this.itemIndex = e.currentTarget.dataset.index;
    this.highlightItem();
    this.selectItem();
  }

  renderList(mentionChar, data, searchTerm) {
    if (data && data.length > 0) {
      this.values = data;
      this.mentionList.innerHTML = "";

      for (let i = 0; i < data.length; i += 1) {
        const li = document.createElement("li");
        li.className = this.options.listItemClass
          ? this.options.listItemClass
          : "";
        li.dataset.index = i;
        li.innerHTML = this.options.renderItem(data[i], searchTerm);
        li.onmouseenter = this.onItemMouseEnter.bind(this);
        li.dataset.denotationChar = mentionChar;
        li.onclick = this.onItemClick.bind(this);
        this.mentionList.appendChild(
          attachDataValues(li, data[i], this.options.dataAttributes)
        );
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
    this.suspendMouseEnter = true;
    this.highlightItem();
  }

  prevItem() {
    this.itemIndex =
      (this.itemIndex + this.values.length - 1) % this.values.length;
    this.suspendMouseEnter = true;
    this.highlightItem();
  }

  containerBottomIsNotVisible(topPos, containerPos) {
    const mentionContainerBottom =
      topPos + this.mentionContainer.offsetHeight + containerPos.top;
    return mentionContainerBottom > window.pageYOffset + window.innerHeight;
  }

  containerRightIsNotVisible(leftPos, containerPos) {
    if (this.options.fixMentionsToQuill) {
      return false;
    }

    const rightPos =
      leftPos + this.mentionContainer.offsetWidth + containerPos.left;
    const browserWidth =
      window.pageXOffset + document.documentElement.clientWidth;
    return rightPos > browserWidth;
  }

  setIsOpen(isOpen) {
    if (this.isOpen !== isOpen) {
      if (isOpen) {
        this.options.onOpen();
      } else {
        this.options.onClose();
      }
      this.isOpen = isOpen;
    }
  }

  setMentionContainerPosition() {
    const containerPos = this.quill.container.getBoundingClientRect();
    const mentionCharPos = this.quill.getBounds(this.mentionCharPos);
    const containerHeight = this.mentionContainer.offsetHeight;

    let topPos = this.options.offsetTop;
    let leftPos = this.options.offsetLeft;

    // handle horizontal positioning
    if (this.options.fixMentionsToQuill) {
      const rightPos = 0;
      this.mentionContainer.style.right = `${rightPos}px`;
    } else {
      leftPos += mentionCharPos.left;
    }

    if (this.containerRightIsNotVisible(leftPos, containerPos)) {
      const containerWidth =
        this.mentionContainer.offsetWidth + this.options.offsetLeft;
      const quillWidth = containerPos.width;
      leftPos = quillWidth - containerWidth;
    }

    // handle vertical positioning
    if (this.options.defaultMenuOrientation === "top") {
      // Attempt to align the mention container with the top of the quill editor
      if (this.options.fixMentionsToQuill) {
        topPos = -1 * (containerHeight + this.options.offsetTop);
      } else {
        topPos =
          mentionCharPos.top - (containerHeight + this.options.offsetTop);
      }

      // default to bottom if the top is not visible
      if (topPos + containerPos.top <= 0) {
        let overMentionCharPos = this.options.offsetTop;

        if (this.options.fixMentionsToQuill) {
          overMentionCharPos += containerPos.height;
        } else {
          overMentionCharPos += mentionCharPos.bottom;
        }

        topPos = overMentionCharPos;
      }
    } else {
      // Attempt to align the mention container with the bottom of the quill editor
      if (this.options.fixMentionsToQuill) {
        topPos += containerPos.height;
      } else {
        topPos += mentionCharPos.bottom;
      }

      // default to the top if the bottom is not visible
      if (this.containerBottomIsNotVisible(topPos, containerPos)) {
        let overMentionCharPos = this.options.offsetTop * -1;

        if (!this.options.fixMentionsToQuill) {
          overMentionCharPos += mentionCharPos.top;
        }

        topPos = overMentionCharPos - containerHeight;
      }
    }

    if (topPos >= 0) {
      this.options.mentionContainerClass.split(' ').forEach(className => {
        this.mentionContainer.classList.add(`${className}-bottom`);
        this.mentionContainer.classList.remove(`${className}-top`);
      });
    } else {
      this.options.mentionContainerClass.split(' ').forEach(className => {
        this.mentionContainer.classList.add(`${className}-top`);
        this.mentionContainer.classList.remove(`${className}-bottom`);
      });
    }

    this.mentionContainer.style.top = `${topPos}px`;
    this.mentionContainer.style.left = `${leftPos}px`;

    this.mentionContainer.style.visibility = "visible";
  }

  getTextBeforeCursor() {
    const startPos = Math.max(0, this.cursorPos - this.options.maxChars);
    const textBeforeCursorPos = this.quill.getText(
      startPos,
      this.cursorPos - startPos
    );
    return textBeforeCursorPos;
  }

  onSomethingChange() {
    const range = this.quill.getSelection();
    if (range == null) return;

    this.cursorPos = range.index;
    const textBeforeCursor = this.getTextBeforeCursor();
    const { mentionChar, mentionCharIndex } = getMentionCharIndex(
      textBeforeCursor,
      this.options.mentionDenotationChars
    );

    if (
      hasValidMentionCharIndex(
        mentionCharIndex,
        textBeforeCursor,
        this.options.isolateCharacter
      )
    ) {
      const mentionCharPos =
        this.cursorPos - (textBeforeCursor.length - mentionCharIndex);
      this.mentionCharPos = mentionCharPos;
      const textAfter = textBeforeCursor.substring(
        mentionCharIndex + mentionChar.length
      );
      if (
        textAfter.length >= this.options.minChars &&
        hasValidChars(textAfter, this.options.allowedChars)
      ) {
        this.options.source(
          textAfter,
          this.renderList.bind(this, mentionChar),
          mentionChar
        );
      } else {
        this.hideMentionList();
      }
    } else {
      this.hideMentionList();
    }
  }

  onTextChange(delta, oldDelta, source) {
    if (source === "user") {
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

Quill.register("modules/mention", Mention);

export default Mention;
