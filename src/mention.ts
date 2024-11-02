import Quill from "quill";
import {Keys} from "./constants";
import {
  attachDataValues,
  getMentionCharIndex,
  hasValidChars,
  hasValidMentionCharIndex,
  setInnerContent,
} from "./utils";
import type { Delta, EmitterSource, Range } from "quill/core";

const Module = Quill.import("core/module");

export interface MentionOption {
  /**
   * Specifies which characters will cause the mention autocomplete to open
   * @default ["@"]
   */
  mentionDenotationChars: string[];

  /**
   * Whether to show the used denotation character in the mention item or not
   * @default true
   */
  showDenotationChar: boolean;

  /**
   * Allowed characters in search term triggering a search request using regular expressions. Can be a function that takes the denotationChar and returns a regex.
   * @default /^[a-zA-Z0-9_]*$/
   */
  allowedChars: RegExp | ((char: string) => RegExp);

  /**
   * Minimum number of characters after the @ symbol triggering a search request
   * @default 0
   */
  minChars: number;

  /**
   * Maximum number of characters after the @ symbol triggering a search request
   * @default 31
   */
  maxChars: number;

  /**
   * Additional top offset of the mention container position
   * @default 2
   */
  offsetTop: number;

  /**
   * Additional left offset of the mention container position
   * @default 0
   */
  offsetLeft: number;

  /**
   * Whether or not the denotation character(s) should be isolated. For example, to avoid mentioning in an email.
   * @default false
   */
  isolateCharacter: boolean;

  /**
   * Only works if isolateCharacter is set to true. Whether or not the denotation character(s) can appear inline of the mention text. For example, to allow mentioning an email with the @ symbol as the denotation character.
   * @default false
   */
  allowInlineMentionChar: boolean;

  /**
   * When set to true, the mentions menu will be rendered above or below the quill container. Otherwise, the mentions menu will track the denotation character(s);
   * @default false
   */
  fixMentionsToQuill: boolean;

  /**
   * Options are 'normal' and 'fixed'. When 'fixed', the menu will be appended to the body and use fixed positioning. Use this if the menu is clipped by a parent element that's using `overflow:hidden
   * @default "normal"
   */
  positioningStrategy: "normal" | "fixed";
  /**
   * Options are 'bottom' and 'top'. Determines what the default orientation of the menu will be. Quill-mention will attempt to render the menu either above or below the editor. If 'top' is provided as a value, and there is not enough space above the editor, the menu will be rendered below. Vice versa, if there is not enough space below the editor, and 'bottom' is provided as a value (or no value is provided at all), the menu will be rendered above the editor.
   * @default "bottom"
   */
  defaultMenuOrientation: "top" | "bottom";

  /**
   * The name of the Quill Blot to be used for inserted mentions. A default implementation is provided named 'mention', which may be overridden with a custom blot.
   * @default "mention"
   */
  blotName: string;

  /**
   * A list of data values you wish to be passed from your list data to the html node. (id, value, denotationChar, link, target are included by default).
   * @default ["id", "value", "denotationChar", "link", "target", "disabled"]
   */
  dataAttributes: string[];

  /**
   * Link target for mentions with a link
   * @default "_blank"
   */
  linkTarget: string;

  /**
   * Style class to be used for list items (may be null)
   * @default "ql-mention-list-item"
   */
  listItemClass: string;

  /**
   * Style class to be used for the mention list container (may be null)
   * @default "ql-mention-list-container"
   */
  mentionContainerClass: string;

  /**
   * Style class to be used for the mention list (may be null)
   * @default "ql-mention-list"
   */
  mentionListClass: string;

  /**
   * Whether or not insert 1 space after mention block in text
   * @default true
   */
  spaceAfterInsert: boolean;

  /**
   * An array of keyboard key codes that will trigger the select action for the mention dropdown. Default is ENTER key. See this reference for a list of numbers for each keyboard key.
   * @default [13]
   */
  selectKeys: (string | number | string)[];
  /**
   * Required callback function to handle the search term and connect it to a data source for matches. The data source can be a local source or an AJAX request.
   * The callback should call renderList(matches, searchTerm); with matches of JSON Objects in an array to show the result for the user. The JSON Objects should have id and value but can also have other values to be used in renderItem for custom display.
   * @param textAfter
   * @param render
   * @param mentionChar
   * @returns
   */
  source: (
    textAfter: string,
    renderList: (
      matches: {
        id: string;
        value: string;
        [key: string]: string | undefined;
      }[],
      searchTerm: string
    ) => void,
    mentionChar: string
  ) => void;

  /**
   * Callback when mention dropdown is open.
   * @returns
   */
  onOpen: () => boolean;

  /**
   * Callback before the DOM of mention dropdown is removed.
   * @returns
   */
  onBeforeClose: () => boolean;

  /**
   * Callback when mention dropdown is closed.
   * @returns
   */
  onClose: () => boolean;
  /**
   * A function that gives you control over how matches from source are displayed. You can use this function to highlight the search term or change the design with custom HTML. This function will need to return either a string possibly containing unsanitized user content, or a class implementing the Node interface which will be treated as a sanitized DOM node.
   * @param item
   * @param searchTerm
   * @returns
   */
  renderItem: (
    item: { id: string; value: string; [key: string]: unknown },
    searchTerm: string
  ) => string | HTMLElement;

  /**
   * A function that returns the HTML for a loading message during async calls from source. The function will need to return either a string possibly containing unsanitized user content, or a class implementing the Node interface which will be treated as a sanitized DOM node. The default functions returns null to prevent a loading message.
   * @returns
   */
  renderLoading: () => string | HTMLElement | null;

  /**
   * Callback for a selected item. When overriding this method, insertItem should be used to insert item to the editor. This makes async requests possible.
   * @param item
   * @param insertItem
   */
  onSelect: (
    item: DOMStringMap,
    insertItem: (
      data: Record<string, unknown>,
      programmaticInsert?: boolean,
      overriddenOptions?: object
    ) => void
  ) => void;
}

export class Mention extends Module<MentionOption> {
  static DEFAULTS: MentionOption = {
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
      renderList(
        [] as {
          id: string;
          value: string;
          [key: string]: string | undefined;
        }[],
        searchTerm
      );
    },
    renderItem: ({ value }) => `${value}`,
    onSelect: (item, insertItem) => insertItem(item),
    onOpen: () => true,
    onBeforeClose: () => true,
    onClose: () => true,
    renderLoading: () => null,
  };

  private isOpen: boolean;
  private itemIndex: number;
  private mentionCharPos?: number;
  private cursorPos?: number;
  private values: { id: string; value: string; [key: string]: unknown }[];
  private suspendMouseEnter: boolean;
  /**
   * this token is an object that may contains one key "abandoned", set to
   * true when the previous source call should be ignored in favor or a
   * more recent execution. This token will be undefined unless a source call
   * is in progress.
   */
  private existingSourceExecutionToken?: { abandoned: boolean };
  private mentionContainer: HTMLDivElement;
  private mentionList: HTMLUListElement;

  constructor(quill: Quill, options?: Partial<MentionOption>) {
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
      const key: keyof MentionOption = o as keyof MentionOption;
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

    quill.keyboard.addBinding(
      {
        key: Keys.TAB,
      },
      this.selectHandler.bind(this)
    );
    quill.keyboard.bindings[Keys.TAB].unshift(
      quill.keyboard.bindings[Keys.TAB].pop()!
    );

    for (let selectKey of this.options.selectKeys ?? []) {
      quill.keyboard.addBinding(
        {
          key: selectKey,
        },
        this.selectHandler.bind(this)
      );
    }
    quill.keyboard.bindings[Keys.ENTER].unshift(
      quill.keyboard.bindings[Keys.ENTER].pop()!
    );

    quill.keyboard.addBinding(
      {
        key: Keys.ESCAPE,
      },
      this.escapeHandler.bind(this)
    );

    quill.keyboard.addBinding(
      {
        key: Keys.UP,
      },
      this.upHandler.bind(this)
    );

    quill.keyboard.addBinding(
      {
        key: Keys.DOWN,
      },
      this.downHandler.bind(this)
    );
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
    } else {
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

    const elementAtItemIndex = this.mentionList.childNodes[
      this.itemIndex
    ] as HTMLElement;
    if (
      this.itemIndex === -1 ||
      elementAtItemIndex.dataset.disabled === "true"
    ) {
      return;
    }

    elementAtItemIndex.classList.add("selected");
    this.quill.root.setAttribute(
      "aria-activedescendant",
      elementAtItemIndex.id
    );

    if (scrollItemInView) {
      const itemHeight =
        elementAtItemIndex.offsetHeight;
      const itemPos = elementAtItemIndex.offsetTop;
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

  onContainerMouseMove() {
    this.suspendMouseEnter = false;
  }

  selectItem() {
    if (this.itemIndex === -1) {
      return;
    }
    const elementAtItemIndex = this.mentionList.childNodes[
      this.itemIndex
    ] as HTMLElement;
    const data = elementAtItemIndex.dataset;
    if (data.disabled) {
      return;
    }
    this.options.onSelect?.(
      data,
      (asyncData, programmaticInsert = false, overriddenOptions = {}) => {
        this.hideMentionList();
        this.mentionList.classList.remove("loading");
        return this.insertItem(
          asyncData,
          programmaticInsert,
          overriddenOptions
        );
      }
    );
    this.renderLoadingSelect();
  }

  insertItem(
    data: {[key: string]: unknown} | null,
    programmaticInsert: boolean,
    overriddenOptions = {}
  ) {
    const render = data;
    if (
      render === null ||
      this.mentionCharPos === undefined ||
      this.cursorPos === undefined
    ) {
      return;
    }
    const options = { ...this.options, ...overriddenOptions };

    if (!options.showDenotationChar) {
      render.denotationChar = "";
    }

    let insertAtPos: number;

    if (!programmaticInsert) {
      insertAtPos = this.mentionCharPos;
      this.quill.deleteText(
        this.mentionCharPos,
        this.cursorPos - this.mentionCharPos,
        Quill.sources.USER
      );
    } else {
      insertAtPos = this.cursorPos;
    }
    const delta = this.quill.insertEmbed(
      insertAtPos,
      options.blotName ?? Mention.DEFAULTS.blotName,
      render,
      Quill.sources.USER
    );
    if (options.spaceAfterInsert) {
      this.quill.insertText(insertAtPos + 1, " ", Quill.sources.USER);
      // setSelection here sets cursor position
      this.quill.setSelection(insertAtPos + 2, Quill.sources.USER);
    } else {
      this.quill.setSelection(insertAtPos + 1, Quill.sources.USER);
    }
    this.hideMentionList();
    return delta;
  }

  onItemMouseEnter(e: Event) {
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

  onItemClick(e: Event) {
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

  onItemMouseDown(e: Event) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  renderLoading() {
    const renderedLoading = this.options.renderLoading?.() ?? undefined;
    if (renderedLoading === undefined) {
      return;
    }

    if (
      this.mentionContainer.getElementsByClassName("ql-mention-loading")
        .length > 0
    ) {
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
    const loadingDiv =
      this.mentionContainer.getElementsByClassName("ql-mention-loading");
    if (loadingDiv.length > 0) {
      loadingDiv[0].remove();
    }
  }

  renderLoadingSelect() {
    if (this.itemIndex === -1) {
      return;
    }
    const elementAtItemIndex = this.mentionList.childNodes[
      this.itemIndex
    ] as HTMLElement;
    for (let i = 0; i < this.mentionList.childNodes.length; i += 1) {
      const element = this.mentionList.childNodes[i] as HTMLElement;
      element.classList.add("disabled");
      element.onmouseenter = null;
      element.onmouseup = null;
      element.onmousedown = null;
    }
    this.mentionList.classList.add("loading");
  }

  renderList(
    mentionChar: string,
    data: { id: string; value: string; [key: string]: string | undefined }[],
    searchTerm: string
  ) {
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
        } else if (initialSelection === -1) {
          initialSelection = i;
        }
        li.dataset.index = i.toString();
        const renderedItem = this.options.renderItem!(data[i], searchTerm);
        setInnerContent(li, renderedItem);
        if (!data[i].disabled) {
          li.onmouseenter = this.onItemMouseEnter.bind(this);
          li.onmouseup = this.onItemClick.bind(this);
          li.onmousedown = this.onItemMouseDown.bind(this);
        } else {
          li.onmouseenter = this.onDisabledItemMouseEnter.bind(this);
        }
        li.dataset.denotationChar = mentionChar;
        this.mentionList.appendChild(
          attachDataValues(li, data[i], this.options.dataAttributes!)
        );
      }
      this.itemIndex = initialSelection;
      this.highlightItem();
      this.showMentionList();
    } else {
      this.hideMentionList();
    }
  }

  nextItem() {
    let increment = 0;
    let newIndex: number;
    let disabled: boolean;
    do {
      increment++;
      newIndex = (this.itemIndex + increment) % this.values.length;
      disabled =
        (this.mentionList.childNodes[newIndex] as HTMLElement).dataset
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
    let newIndex: number;
    let disabled: boolean;
    do {
      decrement++;
      newIndex =
        (this.itemIndex + this.values.length - decrement) % this.values.length;
      disabled =
        (this.mentionList.childNodes[newIndex] as HTMLElement).dataset
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

  containerBottomIsNotVisible(topPos: number, containerPos: DOMRect) {
    const mentionContainerBottom =
      topPos + this.mentionContainer.offsetHeight + containerPos.top;
    return mentionContainerBottom > window.scrollY + window.innerHeight;
  }

  containerRightIsNotVisible(leftPos: number, containerPos: DOMRect) {
    if (this.options.fixMentionsToQuill) {
      return false;
    }

    const rightPos =
      leftPos + this.mentionContainer.offsetWidth + containerPos.left;
    const browserWidth = window.scrollX + document.documentElement.clientWidth;
    return rightPos > browserWidth;
  }

  setIsOpen(isOpen: boolean) {
    if (this.isOpen !== isOpen) {
      if (isOpen) {
        this.options.onOpen?.();
      } else {
        this.options.onClose?.();
      }
      this.isOpen = isOpen;
    }
  }

  setMentionContainerPosition() {
    if (this.options.positioningStrategy === "fixed") {
      this.setMentionContainerPosition_Fixed();
    } else {
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

    let topPos = this.options.offsetTop!;
    let leftPos = this.options.offsetLeft!;

    // handle horizontal positioning
    if (this.options.fixMentionsToQuill) {
      const rightPos = 0;
      this.mentionContainer.style.right = `${rightPos}px`;
    } else {
      leftPos += mentionCharPos.left;
    }

    if (this.containerRightIsNotVisible(leftPos, containerPos)) {
      const containerWidth =
        this.mentionContainer.offsetWidth + this.options.offsetLeft!;
      const quillWidth = containerPos.width;
      leftPos = quillWidth - containerWidth;
    }

    // handle vertical positioning
    if (this.options.defaultMenuOrientation === "top") {
      // Attempt to align the mention container with the top of the quill editor
      if (this.options.fixMentionsToQuill) {
        topPos = -1 * (containerHeight + this.options.offsetTop!);
      } else {
        topPos =
          mentionCharPos.top - (containerHeight + this.options.offsetTop!);
      }

      // default to bottom if the top is not visible
      if (topPos + containerPos.top <= 0) {
        let overMentionCharPos = this.options.offsetTop!;

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
        let overMentionCharPos = this.options.offsetTop! * -1;

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
    } else {
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

    let topPos = this.options.offsetTop!;
    let leftPos = this.options.offsetLeft!;

    // handle horizontal positioning
    if (this.options.fixMentionsToQuill) {
      const rightPos = relativeToPos.right;
      this.mentionContainer.style.right = `${rightPos}px`;
    } else {
      leftPos += relativeToPos.left;

      //if its off the righ edge, push it back
      if (
        leftPos + this.mentionContainer.offsetWidth >
        document.documentElement.clientWidth
      ) {
        leftPos -=
          leftPos +
          this.mentionContainer.offsetWidth -
          document.documentElement.clientWidth;
      }
    }

    const availableSpaceTop = relativeToPos.top;
    const availableSpaceBottom =
      document.documentElement.clientHeight -
      (relativeToPos.top + relativeToPos.height);

    const fitsBottom =
      this.mentionContainer.offsetHeight <= availableSpaceBottom;
    const fitsTop = this.mentionContainer.offsetHeight <= availableSpaceTop;

    let placement: "top" | "bottom";
    if (this.options.defaultMenuOrientation === "top" && fitsTop) {
      placement = "top";
    } else if (this.options.defaultMenuOrientation === "bottom" && fitsBottom) {
      placement = "bottom";
    } else {
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
    } else {
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
    const startPos = Math.max(
      0,
      (this.cursorPos ?? 0) - this.options.maxChars!
    );
    const textBeforeCursorPos = this.quill.getText(
      startPos,
      (this.cursorPos ?? 0) - startPos
    );
    return textBeforeCursorPos;
  }

  onSomethingChange() {
    const range = this.quill.getSelection();
    if (range == null) return;

    this.cursorPos = range.index;
    const textBeforeCursor = this.getTextBeforeCursor();

    const textOffset = Math.max(0, this.cursorPos - this.options.maxChars!);
    const textPrefix = textOffset
      ? this.quill.getText(textOffset - 1, textOffset)
      : "";

    const { mentionChar, mentionCharIndex } = getMentionCharIndex(
      textBeforeCursor,
      this.options.mentionDenotationChars!,
      this.options.isolateCharacter!,
      this.options.allowInlineMentionChar!
    );

    if (
      mentionChar !== null &&
      hasValidMentionCharIndex(
        mentionCharIndex,
        textBeforeCursor,
        this.options.isolateCharacter!,
        textPrefix
      )
    ) {
      const mentionCharPos =
        this.cursorPos - (textBeforeCursor.length - mentionCharIndex);
      this.mentionCharPos = mentionCharPos;
      const textAfter = textBeforeCursor.substring(
        mentionCharIndex + mentionChar.length
      );
      if (
        textAfter.length >= this.options.minChars! &&
        hasValidChars(textAfter, this.getAllowedCharsRegex(mentionChar))
      ) {
        if (this.existingSourceExecutionToken) {
          this.existingSourceExecutionToken.abandoned = true;
        }
        this.renderLoading();
        const sourceRequestToken = {
          abandoned: false,
        };
        this.existingSourceExecutionToken = sourceRequestToken;
        this.options.source?.(
          textAfter,
          (data, searchTerm) => {
            if (sourceRequestToken.abandoned) {
              return;
            }
            this.existingSourceExecutionToken = undefined;
            this.renderList(mentionChar, data, searchTerm);
          },
          mentionChar
        );
      } else {
        if (this.existingSourceExecutionToken) {
          this.existingSourceExecutionToken.abandoned = true;
        }
        this.hideMentionList();
      }
    } else {
      if (this.existingSourceExecutionToken) {
        this.existingSourceExecutionToken.abandoned = true;
      }
      this.hideMentionList();
    }
  }

  getAllowedCharsRegex(denotationChar: string): RegExp {
    if (this.options.allowedChars instanceof RegExp) {
      return this.options.allowedChars!;
    } else {
      return this.options.allowedChars?.(denotationChar) ?? /^[a-zA-Z0-9_]*$/;
    }
  }

  onTextChange(delta: Delta, oldContent: Delta, source: EmitterSource) {
    if (source === "user") {
      setTimeout(this.onSomethingChange.bind(this), 50);
    }
  }

  onSelectionChange(range: Range | null) {
    if (range !== null && range.length === 0) {
      this.onSomethingChange();
    } else {
      this.hideMentionList();
    }
  }

  openMenu(denotationChar: string) {
    const selection = this.quill.getSelection(true);
    this.quill.insertText(selection.index, denotationChar);
    this.quill.blur();
    this.quill.focus();
  }
}
