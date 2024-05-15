(function (Quill) {
    'use strict';

    const Embed = Quill.import("blots/embed");
    class MentionEvent extends Event {
        constructor(name, options) {
            super(name, options);
            this.value = {};
            this.event = new Event(name);
        }
    }
    function isMentionBlotData(data) {
        return (typeof data === "object" &&
            data !== null &&
            "value" in data &&
            typeof data.value === "string" &&
            "denotationChar" in data &&
            typeof data.denotationChar === "string");
    }
    class MentionBlot extends Embed {
        constructor(scroll, node) {
            super(scroll, node);
            this.mounted = false;
        }
        static create(data) {
            const node = super.create();
            if (!isMentionBlotData(data) || node instanceof HTMLElement === false) {
                return node;
            }
            const denotationChar = document.createElement("span");
            denotationChar.className = "ql-mention-denotation-char";
            denotationChar.innerText = data.denotationChar;
            node.appendChild(denotationChar);
            if (typeof this.render === "function") {
                node.appendChild(this.render(data));
            }
            else {
                node.innerText += data.value;
            }
            return MentionBlot.setDataValues(node, data);
        }
        static setDataValues(element, data) {
            const domNode = element;
            Object.keys(data).forEach((key) => {
                domNode.dataset[key] = data[key];
            });
            return domNode;
        }
        static value(domNode) {
            return domNode.dataset;
        }
        attach() {
            super.attach();
            if (!this.mounted) {
                this.mounted = true;
                this.clickHandler = this.getClickHandler();
                this.hoverHandler = this.getHoverHandler();
                this.domNode.addEventListener("click", this.clickHandler, false);
                this.domNode.addEventListener("mouseenter", this.hoverHandler, false);
            }
        }
        detach() {
            super.detach();
            this.mounted = false;
            if (this.clickHandler) {
                this.domNode.removeEventListener("click", this.clickHandler);
                this.clickHandler = undefined;
            }
        }
        getClickHandler() {
            return (e) => {
                const event = this.buildEvent("mention-clicked", e);
                window.dispatchEvent(event);
                e.preventDefault();
            };
        }
        getHoverHandler() {
            return (e) => {
                const event = this.buildEvent("mention-hovered", e);
                window.dispatchEvent(event);
                e.preventDefault();
            };
        }
        buildEvent(name, e) {
            const event = new MentionEvent(name, {
                bubbles: true,
                cancelable: true,
            });
            event.value = Object.assign({}, this.domNode.dataset);
            event.event = e;
            return event;
        }
    }
    MentionBlot.blotName = "mention";
    MentionBlot.tagName = "span";
    MentionBlot.className = "mention";

    const Keys = {
        TAB: "Tab",
        ENTER: "Enter",
        ESCAPE: "Escape",
        UP: "ArrowUp",
        DOWN: "ArrowDown",
    };

    function attachDataValues(element, data, dataAttributes) {
        const mention = element;
        Object.keys(data).forEach((key) => {
            if (dataAttributes.indexOf(key) > -1) {
                mention.dataset[key] = data[key];
            }
            else {
                delete mention.dataset[key];
            }
        });
        return mention;
    }
    function setInnerContent(element, value) {
        if (value === null)
            return;
        if (typeof value === "object")
            element.appendChild(value);
        else
            element.innerText = value;
    }
    function getMentionCharIndex(text, mentionDenotationChars, isolateChar, allowInlineMentionChar) {
        return mentionDenotationChars.reduce((prev, mentionChar) => {
            let mentionCharIndex;
            if (isolateChar && allowInlineMentionChar) {
                const regex = new RegExp(`^${mentionChar}|\\s${mentionChar}`, "g");
                const lastMatch = (text.match(regex) || []).pop();
                if (!lastMatch) {
                    return {
                        mentionChar: prev.mentionChar,
                        mentionCharIndex: prev.mentionCharIndex,
                    };
                }
                mentionCharIndex =
                    lastMatch !== mentionChar
                        ? text.lastIndexOf(lastMatch) +
                            lastMatch.length -
                            mentionChar.length
                        : 0;
            }
            else {
                mentionCharIndex = text.lastIndexOf(mentionChar);
            }
            if (mentionCharIndex > prev.mentionCharIndex) {
                return {
                    mentionChar,
                    mentionCharIndex,
                };
            }
            return {
                mentionChar: prev.mentionChar,
                mentionCharIndex: prev.mentionCharIndex,
            };
        }, { mentionChar: null, mentionCharIndex: -1 });
    }
    function hasValidChars(text, allowedChars) {
        return allowedChars.test(text);
    }
    function hasValidMentionCharIndex(mentionCharIndex, text, isolateChar, textPrefix) {
        if (mentionCharIndex === -1) {
            return false;
        }
        if (!isolateChar) {
            return true;
        }
        const mentionPrefix = mentionCharIndex
            ? text[mentionCharIndex - 1]
            : textPrefix;
        return !mentionPrefix || !!mentionPrefix.match(/\s/);
    }

    const Module = Quill.import("core/module");
    class Mention extends Module {
        constructor(quill, options) {
            super(quill, options);
            this.isOpen = false;
            this.itemIndex = 0;
            this.values = [];
            this.suspendMouseEnter = false;
            if (Array.isArray(options?.dataAttributes)) {
                this.options.dataAttributes = this.options.dataAttributes
                    ? this.options.dataAttributes.concat(options.dataAttributes)
                    : options.dataAttributes;
            }
            //Bind all option-functions so they have a reasonable context
            for (let o in this.options) {
                const key = o;
                const value = this.options[key];
                if (typeof value === "function") {
                    // @ts-ignore
                    this.options[key] = value.bind(this);
                }
            }
            //create mention container
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
            this.mentionList.id = "quill-mention-list";
            quill.root.setAttribute("aria-owns", "quill-mention-list");
            this.mentionList.className = this.options.mentionListClass
                ? this.options.mentionListClass
                : "";
            this.mentionContainer.appendChild(this.mentionList);
            quill.on("text-change", this.onTextChange.bind(this));
            quill.on("selection-change", this.onSelectionChange.bind(this));
            //Pasting doesn't fire selection-change after the pasted text is
            //inserted, so here we manually trigger one
            quill.container.addEventListener("paste", () => {
                setTimeout(() => {
                    const range = quill.getSelection();
                    this.onSelectionChange(range);
                });
            });
            quill.keyboard.addBinding({
                key: Keys.TAB,
            }, this.selectHandler.bind(this));
            quill.keyboard.bindings[Keys.TAB].unshift(quill.keyboard.bindings[Keys.TAB].pop());
            for (let selectKey of this.options.selectKeys ?? []) {
                quill.keyboard.addBinding({
                    key: selectKey,
                }, this.selectHandler.bind(this));
            }
            quill.keyboard.bindings[Keys.ENTER].unshift(quill.keyboard.bindings[Keys.ENTER].pop());
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
            if (this.isOpen && !this.existingSourceExecutionToken) {
                this.selectItem();
                return false;
            }
            return true;
        }
        escapeHandler() {
            if (this.isOpen) {
                if (this.existingSourceExecutionToken) {
                    this.existingSourceExecutionToken.abandoned = true;
                }
                this.hideMentionList();
                return false;
            }
            return true;
        }
        upHandler() {
            if (this.isOpen && !this.existingSourceExecutionToken) {
                this.prevItem();
                return false;
            }
            return true;
        }
        downHandler() {
            if (this.isOpen && !this.existingSourceExecutionToken) {
                this.nextItem();
                return false;
            }
            return true;
        }
        showMentionList() {
            if (this.options.positioningStrategy === "fixed") {
                document.body.appendChild(this.mentionContainer);
            }
            else {
                this.quill.container.appendChild(this.mentionContainer);
            }
            this.mentionContainer.style.visibility = "hidden";
            this.mentionContainer.style.display = "";
            this.mentionContainer.scrollTop = 0;
            this.setMentionContainerPosition();
            this.setIsOpen(true);
        }
        hideMentionList() {
            if (this.options.onBeforeClose) {
                this.options.onBeforeClose();
            }
            this.mentionContainer.style.display = "none";
            this.mentionContainer.remove();
            this.setIsOpen(false);
            this.quill.root.removeAttribute("aria-activedescendant");
        }
        highlightItem(scrollItemInView = true) {
            for (let i = 0; i < this.mentionList.childNodes.length; i += 1) {
                const element = this.mentionList.childNodes[i];
                if (element instanceof HTMLElement) {
                    element.classList.remove("selected");
                }
            }
            const elementAtItemIndex = this.mentionList.childNodes[this.itemIndex];
            if (this.itemIndex === -1 ||
                elementAtItemIndex.dataset.disabled === "true") {
                return;
            }
            elementAtItemIndex.classList.add("selected");
            this.quill.root.setAttribute("aria-activedescendant", elementAtItemIndex.id);
            if (scrollItemInView) {
                const itemHeight = elementAtItemIndex.offsetHeight;
                const itemPos = elementAtItemIndex.offsetTop;
                const containerTop = this.mentionContainer.scrollTop;
                const containerBottom = containerTop + this.mentionContainer.offsetHeight;
                if (itemPos < containerTop) {
                    // Scroll up if the item is above the top of the container
                    this.mentionContainer.scrollTop = itemPos;
                }
                else if (itemPos > containerBottom - itemHeight) {
                    // scroll down if any part of the element is below the bottom of the container
                    this.mentionContainer.scrollTop +=
                        itemPos - containerBottom + itemHeight;
                }
            }
        }
        onContainerMouseMove() {
            this.suspendMouseEnter = false;
        }
        selectItem() {
            if (this.itemIndex === -1) {
                return;
            }
            const elementAtItemIndex = this.mentionList.childNodes[this.itemIndex];
            const data = elementAtItemIndex.dataset;
            if (data.disabled) {
                return;
            }
            this.options.onSelect?.(data, (asyncData, programmaticInsert = false, overriddenOptions = {}) => {
                this.hideMentionList();
                this.mentionList.classList.remove("loading");
                return this.insertItem(asyncData, programmaticInsert, overriddenOptions);
            });
            this.renderLoadingSelect();
        }
        insertItem(data, programmaticInsert, overriddenOptions = {}) {
            const render = data;
            if (render === null ||
                this.mentionCharPos === undefined ||
                this.cursorPos === undefined) {
                return;
            }
            const options = { ...this.options, ...overriddenOptions };
            if (!options.showDenotationChar) {
                render.denotationChar = "";
            }
            let insertAtPos;
            if (!programmaticInsert) {
                insertAtPos = this.mentionCharPos;
                this.quill.deleteText(this.mentionCharPos, this.cursorPos - this.mentionCharPos, Quill.sources.USER);
            }
            else {
                insertAtPos = this.cursorPos;
            }
            const delta = this.quill.insertEmbed(insertAtPos, options.blotName ?? Mention.DEFAULTS.blotName, render, Quill.sources.USER);
            if (options.spaceAfterInsert) {
                this.quill.insertText(insertAtPos + 1, " ", Quill.sources.USER);
                // setSelection here sets cursor position
                this.quill.setSelection(insertAtPos + 2, Quill.sources.USER);
            }
            else {
                this.quill.setSelection(insertAtPos + 1, Quill.sources.USER);
            }
            this.hideMentionList();
            return delta;
        }
        onItemMouseEnter(e) {
            if (this.suspendMouseEnter || e.target instanceof HTMLElement === false) {
                return;
            }
            const index = Number(e.target?.dataset.index);
            if (!Number.isNaN(index) && index !== this.itemIndex) {
                this.itemIndex = index;
                this.highlightItem(false);
            }
        }
        onDisabledItemMouseEnter() {
            if (this.suspendMouseEnter) {
                return;
            }
            this.itemIndex = -1;
            this.highlightItem(false);
        }
        onItemClick(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.currentTarget instanceof HTMLElement === false) {
                return;
            }
            this.itemIndex = e.currentTarget?.dataset.index
                ? Number.parseInt(e.currentTarget.dataset.index)
                : -1;
            this.highlightItem();
            this.selectItem();
        }
        onItemMouseDown(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
        renderLoading() {
            const renderedLoading = this.options.renderLoading?.() ?? undefined;
            if (renderedLoading === undefined) {
                return;
            }
            if (this.mentionContainer.getElementsByClassName("ql-mention-loading")
                .length > 0) {
                this.showMentionList();
                return;
            }
            this.mentionList.innerHTML = "";
            const loadingDiv = document.createElement("div");
            loadingDiv.className = "ql-mention-loading";
            setInnerContent(loadingDiv, renderedLoading);
            this.mentionContainer.append(loadingDiv);
            this.showMentionList();
        }
        removeLoading() {
            const loadingDiv = this.mentionContainer.getElementsByClassName("ql-mention-loading");
            if (loadingDiv.length > 0) {
                loadingDiv[0].remove();
            }
        }
        renderLoadingSelect() {
            if (this.itemIndex === -1) {
                return;
            }
            this.mentionList.childNodes[this.itemIndex];
            for (let i = 0; i < this.mentionList.childNodes.length; i += 1) {
                const element = this.mentionList.childNodes[i];
                element.classList.add("disabled");
                element.onmouseenter = null;
                element.onmouseup = null;
                element.onmousedown = null;
            }
            this.mentionList.classList.add("loading");
        }
        renderList(mentionChar, data, searchTerm) {
            if (data && data.length > 0) {
                this.removeLoading();
                this.values = data;
                this.mentionList.innerText = "";
                let initialSelection = -1;
                for (let i = 0; i < data.length; i += 1) {
                    const li = document.createElement("li");
                    li.id = "quill-mention-item-" + i;
                    li.className = this.options.listItemClass
                        ? this.options.listItemClass
                        : "";
                    if (data[i].disabled) {
                        li.className += " disabled";
                        li.setAttribute("aria-hidden", "true");
                    }
                    else if (initialSelection === -1) {
                        initialSelection = i;
                    }
                    li.dataset.index = i.toString();
                    const renderedItem = this.options.renderItem(data[i], searchTerm);
                    setInnerContent(li, renderedItem);
                    if (!data[i].disabled) {
                        li.onmouseenter = this.onItemMouseEnter.bind(this);
                        li.onmouseup = this.onItemClick.bind(this);
                        li.onmousedown = this.onItemMouseDown.bind(this);
                    }
                    else {
                        li.onmouseenter = this.onDisabledItemMouseEnter.bind(this);
                    }
                    li.dataset.denotationChar = mentionChar;
                    this.mentionList.appendChild(attachDataValues(li, data[i], this.options.dataAttributes));
                }
                this.itemIndex = initialSelection;
                this.highlightItem();
                this.showMentionList();
            }
            else {
                this.hideMentionList();
            }
        }
        nextItem() {
            let increment = 0;
            let newIndex;
            let disabled;
            do {
                increment++;
                newIndex = (this.itemIndex + increment) % this.values.length;
                disabled =
                    this.mentionList.childNodes[newIndex].dataset
                        .disabled === "true";
                if (increment === this.values.length + 1) {
                    //we've wrapped around w/o finding an enabled item
                    newIndex = -1;
                    break;
                }
            } while (disabled);
            this.itemIndex = newIndex;
            this.suspendMouseEnter = true;
            this.highlightItem();
        }
        prevItem() {
            let decrement = 0;
            let newIndex;
            let disabled;
            do {
                decrement++;
                newIndex =
                    (this.itemIndex + this.values.length - decrement) % this.values.length;
                disabled =
                    this.mentionList.childNodes[newIndex].dataset
                        .disabled === "true";
                if (decrement === this.values.length + 1) {
                    //we've wrapped around w/o finding an enabled item
                    newIndex = -1;
                    break;
                }
            } while (disabled);
            this.itemIndex = newIndex;
            this.suspendMouseEnter = true;
            this.highlightItem();
        }
        containerBottomIsNotVisible(topPos, containerPos) {
            const mentionContainerBottom = topPos + this.mentionContainer.offsetHeight + containerPos.top;
            return mentionContainerBottom > window.scrollY + window.innerHeight;
        }
        containerRightIsNotVisible(leftPos, containerPos) {
            if (this.options.fixMentionsToQuill) {
                return false;
            }
            const rightPos = leftPos + this.mentionContainer.offsetWidth + containerPos.left;
            const browserWidth = window.scrollX + document.documentElement.clientWidth;
            return rightPos > browserWidth;
        }
        setIsOpen(isOpen) {
            if (this.isOpen !== isOpen) {
                if (isOpen) {
                    this.options.onOpen?.();
                }
                else {
                    this.options.onClose?.();
                }
                this.isOpen = isOpen;
            }
        }
        setMentionContainerPosition() {
            if (this.options.positioningStrategy === "fixed") {
                this.setMentionContainerPosition_Fixed();
            }
            else {
                this.setMentionContainerPosition_Normal();
            }
        }
        setMentionContainerPosition_Normal() {
            if (this.mentionCharPos === undefined) {
                return;
            }
            const containerPos = this.quill.container.getBoundingClientRect();
            const mentionCharPos = this.quill.getBounds(this.mentionCharPos);
            if (mentionCharPos === null) {
                return;
            }
            const containerHeight = this.mentionContainer.offsetHeight;
            let topPos = this.options.offsetTop;
            let leftPos = this.options.offsetLeft;
            // handle horizontal positioning
            if (this.options.fixMentionsToQuill) {
                const rightPos = 0;
                this.mentionContainer.style.right = `${rightPos}px`;
            }
            else {
                leftPos += mentionCharPos.left;
            }
            if (this.containerRightIsNotVisible(leftPos, containerPos)) {
                const containerWidth = this.mentionContainer.offsetWidth + this.options.offsetLeft;
                const quillWidth = containerPos.width;
                leftPos = quillWidth - containerWidth;
            }
            // handle vertical positioning
            if (this.options.defaultMenuOrientation === "top") {
                // Attempt to align the mention container with the top of the quill editor
                if (this.options.fixMentionsToQuill) {
                    topPos = -1 * (containerHeight + this.options.offsetTop);
                }
                else {
                    topPos =
                        mentionCharPos.top - (containerHeight + this.options.offsetTop);
                }
                // default to bottom if the top is not visible
                if (topPos + containerPos.top <= 0) {
                    let overMentionCharPos = this.options.offsetTop;
                    if (this.options.fixMentionsToQuill) {
                        overMentionCharPos += containerPos.height;
                    }
                    else {
                        overMentionCharPos += mentionCharPos.bottom;
                    }
                    topPos = overMentionCharPos;
                }
            }
            else {
                // Attempt to align the mention container with the bottom of the quill editor
                if (this.options.fixMentionsToQuill) {
                    topPos += containerPos.height;
                }
                else {
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
                this.options.mentionContainerClass?.split(" ").forEach((className) => {
                    this.mentionContainer.classList.add(`${className}-bottom`);
                    this.mentionContainer.classList.remove(`${className}-top`);
                });
            }
            else {
                this.options.mentionContainerClass?.split(" ").forEach((className) => {
                    this.mentionContainer.classList.add(`${className}-top`);
                    this.mentionContainer.classList.remove(`${className}-bottom`);
                });
            }
            this.mentionContainer.style.top = `${topPos}px`;
            this.mentionContainer.style.left = `${leftPos}px`;
            this.mentionContainer.style.visibility = "visible";
        }
        setMentionContainerPosition_Fixed() {
            if (this.mentionCharPos === undefined) {
                return;
            }
            this.mentionContainer.style.position = "fixed";
            this.mentionContainer.style.height = "";
            const containerPos = this.quill.container.getBoundingClientRect();
            const mentionCharPos = this.quill.getBounds(this.mentionCharPos);
            if (mentionCharPos === null) {
                return;
            }
            const mentionCharPosAbsolute = {
                right: containerPos.right - mentionCharPos.right,
                left: containerPos.left + mentionCharPos.left,
                top: containerPos.top + mentionCharPos.top,
                width: 0,
                height: mentionCharPos.height,
            };
            //Which rectangle should it be relative to
            const relativeToPos = this.options.fixMentionsToQuill
                ? containerPos
                : mentionCharPosAbsolute;
            let topPos = this.options.offsetTop;
            let leftPos = this.options.offsetLeft;
            // handle horizontal positioning
            if (this.options.fixMentionsToQuill) {
                const rightPos = relativeToPos.right;
                this.mentionContainer.style.right = `${rightPos}px`;
            }
            else {
                leftPos += relativeToPos.left;
                //if its off the righ edge, push it back
                if (leftPos + this.mentionContainer.offsetWidth >
                    document.documentElement.clientWidth) {
                    leftPos -=
                        leftPos +
                            this.mentionContainer.offsetWidth -
                            document.documentElement.clientWidth;
                }
            }
            const availableSpaceTop = relativeToPos.top;
            const availableSpaceBottom = document.documentElement.clientHeight -
                (relativeToPos.top + relativeToPos.height);
            const fitsBottom = this.mentionContainer.offsetHeight <= availableSpaceBottom;
            const fitsTop = this.mentionContainer.offsetHeight <= availableSpaceTop;
            let placement;
            if (this.options.defaultMenuOrientation === "top" && fitsTop) {
                placement = "top";
            }
            else if (this.options.defaultMenuOrientation === "bottom" && fitsBottom) {
                placement = "bottom";
            }
            else {
                //it doesnt fit either so put it where there's the most space
                placement = availableSpaceBottom > availableSpaceTop ? "bottom" : "top";
            }
            if (placement === "bottom") {
                topPos = relativeToPos.top + relativeToPos.height;
                if (!fitsBottom) {
                    //shrink it to fit
                    //3 is a bit of a fudge factor so it doesnt touch the edge of the screen
                    this.mentionContainer.style.height = availableSpaceBottom - 3 + "px";
                }
                this.options.mentionContainerClass?.split(" ").forEach((className) => {
                    this.mentionContainer.classList.add(`${className}-bottom`);
                    this.mentionContainer.classList.remove(`${className}-top`);
                });
            }
            else {
                topPos = relativeToPos.top - this.mentionContainer.offsetHeight;
                if (!fitsTop) {
                    //shrink it to fit
                    //3 is a bit of a fudge factor so it doesnt touch the edge of the screen
                    this.mentionContainer.style.height = availableSpaceTop - 3 + "px";
                    topPos = 3;
                }
                this.options.mentionContainerClass?.split(" ").forEach((className) => {
                    this.mentionContainer.classList.add(`${className}-top`);
                    this.mentionContainer.classList.remove(`${className}-bottom`);
                });
            }
            this.mentionContainer.style.top = `${topPos}px`;
            this.mentionContainer.style.left = `${leftPos}px`;
            this.mentionContainer.style.visibility = "visible";
        }
        getTextBeforeCursor() {
            const startPos = Math.max(0, (this.cursorPos ?? 0) - this.options.maxChars);
            const textBeforeCursorPos = this.quill.getText(startPos, (this.cursorPos ?? 0) - startPos);
            return textBeforeCursorPos;
        }
        onSomethingChange() {
            const range = this.quill.getSelection();
            if (range == null)
                return;
            this.cursorPos = range.index;
            const textBeforeCursor = this.getTextBeforeCursor();
            const textOffset = Math.max(0, this.cursorPos - this.options.maxChars);
            const textPrefix = textOffset
                ? this.quill.getText(textOffset - 1, textOffset)
                : "";
            const { mentionChar, mentionCharIndex } = getMentionCharIndex(textBeforeCursor, this.options.mentionDenotationChars, this.options.isolateCharacter, this.options.allowInlineMentionChar);
            if (mentionChar !== null &&
                hasValidMentionCharIndex(mentionCharIndex, textBeforeCursor, this.options.isolateCharacter, textPrefix)) {
                const mentionCharPos = this.cursorPos - (textBeforeCursor.length - mentionCharIndex);
                this.mentionCharPos = mentionCharPos;
                const textAfter = textBeforeCursor.substring(mentionCharIndex + mentionChar.length);
                if (textAfter.length >= this.options.minChars &&
                    hasValidChars(textAfter, this.getAllowedCharsRegex(mentionChar))) {
                    if (this.existingSourceExecutionToken) {
                        this.existingSourceExecutionToken.abandoned = true;
                    }
                    this.renderLoading();
                    const sourceRequestToken = {
                        abandoned: false,
                    };
                    this.existingSourceExecutionToken = sourceRequestToken;
                    this.options.source?.(textAfter, (data, searchTerm) => {
                        if (sourceRequestToken.abandoned) {
                            return;
                        }
                        this.existingSourceExecutionToken = undefined;
                        this.renderList(mentionChar, data, searchTerm);
                    }, mentionChar);
                }
                else {
                    if (this.existingSourceExecutionToken) {
                        this.existingSourceExecutionToken.abandoned = true;
                    }
                    this.hideMentionList();
                }
            }
            else {
                if (this.existingSourceExecutionToken) {
                    this.existingSourceExecutionToken.abandoned = true;
                }
                this.hideMentionList();
            }
        }
        getAllowedCharsRegex(denotationChar) {
            if (this.options.allowedChars instanceof RegExp) {
                return this.options.allowedChars;
            }
            else {
                return this.options.allowedChars?.(denotationChar) ?? /^[a-zA-Z0-9_]*$/;
            }
        }
        onTextChange(delta, oldContent, source) {
            if (source === "user") {
                setTimeout(this.onSomethingChange.bind(this), 50);
            }
        }
        onSelectionChange(range) {
            if (range !== null && range.length === 0) {
                this.onSomethingChange();
            }
            else {
                this.hideMentionList();
            }
        }
        openMenu(denotationChar) {
            const selection = this.quill.getSelection(true);
            this.quill.insertText(selection.index, denotationChar);
            this.quill.blur();
            this.quill.focus();
        }
    }
    Mention.DEFAULTS = {
        mentionDenotationChars: ["@"],
        showDenotationChar: true,
        allowedChars: /^[a-zA-Z0-9_]*$/,
        minChars: 0,
        maxChars: 31,
        offsetTop: 2,
        offsetLeft: 0,
        isolateCharacter: false,
        allowInlineMentionChar: false,
        fixMentionsToQuill: false,
        positioningStrategy: "normal",
        defaultMenuOrientation: "bottom",
        blotName: "mention",
        dataAttributes: [
            "id",
            "value",
            "denotationChar",
            "link",
            "target",
            "disabled",
        ],
        linkTarget: "_blank",
        listItemClass: "ql-mention-list-item",
        mentionContainerClass: "ql-mention-list-container",
        mentionListClass: "ql-mention-list",
        spaceAfterInsert: true,
        selectKeys: [Keys.ENTER],
        source: (searchTerm, renderList, mentionChar) => {
            renderList([], searchTerm);
        },
        renderItem: ({ value }) => `${value}`,
        onSelect: (item, insertItem) => insertItem(item),
        onOpen: () => true,
        onBeforeClose: () => true,
        onClose: () => true,
        renderLoading: () => null,
    };

    Quill.register({ "blots/mention": MentionBlot, "modules/mention": Mention });

})(Quill);
