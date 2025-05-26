export class UIManager {
  constructor() {
    this.tooltip = this.createTooltip();
    this.hoveredObject = null;
  }

  createTooltip() {
    const tooltip = document.getElementById('tooltip') || (() => {
      const div = document.createElement('div');
      div.id = 'tooltip';
      div.style.position = 'absolute';
      div.style.background = 'rgba(0, 0, 0, 0.8)';
      div.style.color = 'white';
      div.style.padding = '8px 12px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '14px';
      div.style.pointerEvents = 'none';
      div.style.display = 'none';
      div.style.zIndex = '1000';
      document.body.appendChild(div);
      return div;
    })();
    return tooltip;
  }

  updateTooltip(object, event) {
    if (!object) {
      this.hideTooltip();
      return;
    }

    let tooltipText = '';
    switch (object.userData.type) {
      case 'country':
        tooltipText = object.userData.name;
        break;
      case 'port':
        const date = new Date(object.userData.date).toLocaleDateString();
        tooltipText = `⚓ ${object.userData.portName}, ${object.userData.country}\n🚢 ${object.userData.cruiseName}\n📅 ${date}`;
        break;
      case 'cruise':
        tooltipText = `🚢 ${object.userData.cruiseName}\n⚓ ${object.userData.shipName}\n🏢 ${object.userData.companyName}`;
        break;
    }

    this.tooltip.textContent = tooltipText;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = event.clientX + 10 + 'px';
    this.tooltip.style.top = event.clientY + 10 + 'px';
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  highlightObject(object, highlight = true) {
    if (!object || !object.material) return;
    
    if (highlight) {
      object.material.color.set(0xcccccc); // HOVER_FILL_COLOR
    } else {
      object.material.color.set(0xf5f5f5); // COUNTRY_FILL_COLOR
    }
  }

  handleMouseMove(event, intersects) {
    const object = intersects.length > 0 ? intersects[0].object : null;
    
    if (this.hoveredObject !== object) {
      if (this.hoveredObject) {
        this.highlightObject(this.hoveredObject, false);
      }
      this.hoveredObject = object;
      if (object) {
        this.highlightObject(object, true);
      }
    }

    this.updateTooltip(object, event);
  }
} 