# Chat Auto-Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auto-scroll-to-bottom for the chat page using scroll-into-view + onScroll detection, with a "back to bottom" button when user scrolls up.

**Architecture:** Declarative scroll-into-view on the existing scroll-view, toggled on each message change. onScroll detects user's position; when user scrolls up, auto-scroll stops and a floating button appears.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/JS), scroll-view, scroll-into-view

---

### Task 1: Add scroll attributes and "back to bottom" button to WXML

**Files:**
- Modify: `miniprogram/pages/chat/index.wxml`

- [ ] **Step 1: Add scroll-into-view and bindscroll to the scroll-view**

Replace lines 8-12:
```xml
  <scroll-view
    class="message-list"
    scroll-y
    scroll-with-animation
  >
```
With:
```xml
  <scroll-view
    class="message-list"
    scroll-y
    scroll-with-animation
    scroll-into-view="{{scrollIntoView}}"
    bindscroll="onScroll"
  >
```

- [ ] **Step 2: Add "back to bottom" button between scroll-view and input-area**

Insert between line 150 (`</scroll-view>`) and line 152 (`<!-- ================== 底部输入区域 ================== -->`):

```xml
  <!-- ================== 回到底部按钮 ================== -->
  <view
    class="scroll-to-bottom-btn"
    wx:if="{{showScrollToBottom}}"
    bindtap="onTapScrollToBottom"
  >
    <text class="scroll-to-bottom-icon">&#8595;</text>
    <text>回到底部</text>
  </view>
```

---

### Task 2: Add button styles to WXSS

**Files:**
- Modify: `miniprogram/pages/chat/index.wxss`

- [ ] **Step 1: Add button styles at end of file**

Append after line 227:

```css
/* ==================== 回到底部按钮 ==================== */
.scroll-to-bottom-btn {
  position: fixed;
  bottom: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  background: #4CAF50;
  color: #fff;
  padding: 12rpx 32rpx;
  border-radius: 40rpx;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.scroll-to-bottom-icon {
  font-size: 28rpx;
  font-weight: bold;
}
```

---

### Task 3: Add core scroll logic to index.js

**Files:**
- Modify: `miniprogram/pages/chat/index.js`

- [ ] **Step 1: Add new data properties**

In the `data` block (line 21-30), add after `pendingRecord: null` (line 29):

```javascript
    scrollIntoView: '',       // scroll-into-view 指向的消息 ID
    isAtBottom: true,          // 用户是否在底部
    showScrollToBottom: false  // 是否显示回到底部按钮
```

- [ ] **Step 2: Add onReady lifecycle to capture view height**

Add after `onLoad()` (after line 34, before `onShow`):

```javascript
  onReady() {
    this._scrollThreshold = 50
    this.createSelectorQuery()
      .select('.message-list')
      .boundingClientRect(rect => {
        if (rect) this._viewHeight = rect.height
      })
      .exec()
  },
```

- [ ] **Step 3: Add scrollToBottom method**

Add after `onPullDownRefresh` (before the handlers spread on line 144):

```javascript
  /** 滚动到最新消息（toggle 机制强制 scroll-view 重新定位） */
  scrollToBottom() {
    if (!this.data.isAtBottom) return
    const messages = this.data.messages
    if (!messages.length) return
    const targetId = `msg-${messages[messages.length - 1].id}`
    this.setData({ scrollIntoView: '' }, () => {
      this.setData({ scrollIntoView: targetId })
    })
  },

  /** 滚动事件：检测用户是否在底部 */
  onScroll(e) {
    const threshold = this._scrollThreshold || 50
    const { scrollTop, scrollHeight } = e.detail
    const viewHeight = this._viewHeight || 0
    const isAtBottom = scrollHeight - scrollTop - viewHeight < threshold
    if (isAtBottom && this.data.showScrollToBottom) {
      this.setData({ showScrollToBottom: false, isAtBottom: true })
    } else if (!isAtBottom && !this.data.showScrollToBottom) {
      this.setData({ isAtBottom: false, showScrollToBottom: true })
    }
  },

  /** 点击回到底部按钮 */
  onTapScrollToBottom() {
    this.setData({ isAtBottom: true, showScrollToBottom: false })
    this.scrollToBottom()
  },
```

- [ ] **Step 4: Add scrollToBottom call to initChat**

In `initChat()` (line 68-75), add `this.scrollToBottom()` after both `setData` calls. Replace lines 68-75 with:

```javascript
  initChat() {
    const savedMessages = chatService.loadMessages()
    if (savedMessages) {
      this.setData({ messages: savedMessages }, () => this.scrollToBottom())
    } else {
      this.setData({ messages: chatService.initChat() }, () => this.scrollToBottom())
    }
  },
```

---

### Task 4: Insert scrollToBottom calls in send-message.js

**Files:**
- Modify: `miniprogram/pages/chat/handlers/send-message.js`

- [ ] **Step 1: Add after user message + AI placeholder setData (line 33)**

After `chatService.saveMessages(this.data.messages)` on line 34, add:

```javascript
    this.scrollToBottom()
```

- [ ] **Step 2: Add in onChunk callback (line 48)**

After `this.setData({ messages })` on line 48, add:

```javascript
          this.scrollToBottom()
```

- [ ] **Step 3: Add in onDone callback (line 55)**

After `this.setData({ messages, isLoading: false })` on line 55, add:

```javascript
          this.scrollToBottom()
```

- [ ] **Step 4: Add in onError callback (line 63)**

After `this.setData({ messages, isLoading: false })` on line 63, add:

```javascript
          this.scrollToBottom()
```

- [ ] **Step 5: Add after getRecommendation setData (line 91)**

After `this.setData({ messages: [...this.data.messages, message] })` on line 91, add:

```javascript
        this.scrollToBottom()
```

- [ ] **Step 6: Add after showErrorMessage setData (line 104)**

After `this.setData({ messages: [...this.data.messages, errorMessage] })` on line 104, add:

```javascript
    this.scrollToBottom()
```

---

### Task 5: Insert scrollToBottom calls in image-recognition.js

**Files:**
- Modify: `miniprogram/pages/chat/handlers/image-recognition.js`

- [ ] **Step 1: Add after user image message setData (line 42)**

After `chatService.saveMessages(this.data.messages)` on line 43, add:

```javascript
      this.scrollToBottom()
```

- [ ] **Step 2: Add after date-select message setData (lines 56-63)**

After `chatService.saveMessages(this.data.messages)` on line 63, add:

```javascript
      this.scrollToBottom()
```

- [ ] **Step 3: Add after checkAndShowResult setData (lines 179-185)**

After `chatService.saveMessages(this.data.messages)` on line 186, add:

```javascript
    this.scrollToBottom()
```

- [ ] **Step 4: Add in _progressiveRenderFoods after setData (line 223)**

After `this.setData({ messages })` on line 223, add:

```javascript
        this.scrollToBottom()
```

---

### Task 6: Insert scrollToBottom calls in selection.js

**Files:**
- Modify: `miniprogram/pages/chat/handlers/selection.js`

- [ ] **Step 1: Add after onMealTypeSelect setData (line 33)**

After `chatService.saveMessages(this.data.messages)` on line 34, add:

```javascript
    this.scrollToBottom()
```

- [ ] **Step 2: Add after onDateConfirm setData (line 63)**

After `chatService.saveMessages(this.data.messages)` on line 64, add:

```javascript
    this.scrollToBottom()
```

- [ ] **Step 3: Add after onRatingSelect setData (line 90)**

After `chatService.saveMessages(this.data.messages)` on line 91, add:

```javascript
      this.scrollToBottom()
```

- [ ] **Step 4: Add after waiting message setData (line 101)**

After `chatService.saveMessages(this.data.messages)` on line 102, add:

```javascript
        this.scrollToBottom()
```
