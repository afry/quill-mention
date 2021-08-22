import Quill from "quill";

const Embed = Quill.import("blots/embed");

class MentionBlot extends Embed {
  constructor(scroll, node) {
    super(scroll, node);
    this.clickHandler = null;
    this.mounted = false;
  }

  static create(data) {
    const node = super.create();
    const denotationChar = document.createElement("span");
    denotationChar.className = "ql-mention-denotation-char";
    denotationChar.innerHTML = data.denotationChar;
    node.appendChild(denotationChar);
    node.innerHTML += data.value;
    return MentionBlot.setDataValues(node, data);
  }

  static setDataValues(element, data) {
    const domNode = element;
    Object.keys(data).forEach(key => {
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
      this.clickHandler = e => {
        const event = new Event("mention-clicked", {
          bubbles: true,
          cancelable: true
        });
        event.value = Object.assign({}, this.domNode.dataset);
        event.event = e;
        window.dispatchEvent(event);
        e.preventDefault();
      };
      this.domNode.addEventListener("click", this.clickHandler, false);
    }
  }

  detach() {
    super.detach();
    this.mounted = false;
    if (this.clickHandler) {
      this.domNode.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }
  }
}

MentionBlot.blotName = "mention";
MentionBlot.tagName = "span";
MentionBlot.className = "mention";

Quill.register(MentionBlot);
