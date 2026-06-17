type Color = 'red' | 'yellow' | 'blue' | 'green';

const COLORS: Color[] = ['red', 'yellow', 'blue', 'green'];

interface HighScoreResponse {
  highScore: number;
  isNewRecord?: boolean;
}

class ColorMemoryGame {
  private sequence: Color[] = [];
  private playerIndex: number = 0;
  private isPlaying: boolean = false;
  private isShowingSequence: boolean = false;
  private level: number = 0;
  private highScore: number = 0;

  private isWarmupMode: boolean = false;
  private warmupSequence: Color[] = [];
  private warmupPlayerIndex: number = 0;
  private warmupCorrectCount: number = 0;
  private warmupTotalSteps: number = 0;

  private readonly buttons: NodeListOf<HTMLButtonElement>;
  private readonly startBtn: HTMLButtonElement;
  private readonly currentLevelEl: HTMLElement;
  private readonly highScoreEl: HTMLElement;
  private readonly gameStatusEl: HTMLElement;
  private readonly warmupSelectorEl: HTMLElement;
  private readonly warmupBtns: NodeListOf<HTMLButtonElement>;
  private readonly skipWarmupBtn: HTMLButtonElement;

  private readonly lightOnDuration: number = 600;
  private readonly lightOffDuration: number = 300;

  constructor() {
    this.buttons = document.querySelectorAll('.color-btn');
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.currentLevelEl = document.getElementById('current-level') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    this.gameStatusEl = document.getElementById('game-status') as HTMLElement;
    this.warmupSelectorEl = document.getElementById('warmup-selector') as HTMLElement;
    this.warmupBtns = document.querySelectorAll('.warmup-btn');
    this.skipWarmupBtn = document.getElementById('skip-warmup-btn') as HTMLButtonElement;

    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.fetchHighScore();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startGame());

    this.warmupBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const steps = parseInt((e.target as HTMLButtonElement).dataset.steps || '3', 10);
        this.startWarmup(steps);
      });
    });

    this.skipWarmupBtn.addEventListener('click', () => this.skipWarmup());

    this.buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = (e.target as HTMLButtonElement).dataset.color as Color;
        this.handlePlayerInput(color);
      });
    });
  }

  private async fetchHighScore(): Promise<void> {
    try {
      const response = await fetch('/api/highscore');
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();
    } catch (error) {
      console.error('获取最高分失败:', error);
    }
  }

  private async saveHighScore(score: number): Promise<void> {
    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();

      if (data.isNewRecord) {
        this.showStatus('🎉 新纪录！', 'success');
      }
    } catch (error) {
      console.error('保存最高分失败:', error);
    }
  }

  private startGame(): void {
    this.sequence = [];
    this.playerIndex = 0;
    this.level = 0;
    this.isPlaying = true;
    this.isWarmupMode = false;
    this.currentLevelEl.textContent = '0';

    this.warmupSelectorEl.style.display = 'none';
    this.setButtonsDisabled(true);
    this.startBtn.disabled = true;
    this.startBtn.style.display = 'inline-block';

    this.showStatus('游戏开始！', 'playing');
    this.nextRound();
  }

  private nextRound(): void {
    this.level++;
    this.currentLevelEl.textContent = this.level.toString();
    this.playerIndex = 0;

    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.sequence.push(randomColor);

    this.showStatus(`第 ${this.level} 关 - 记住序列`, 'playing');
    this.showSequence();
  }

  private async showSequence(): Promise<void> {
    this.isShowingSequence = true;
    this.setButtonsDisabled(true);

    await this.delay(500);

    for (let i = 0; i < this.sequence.length; i++) {
      const color = this.sequence[i];
      await this.lightUpButton(color);
      
      if (i < this.sequence.length - 1) {
        await this.delay(this.lightOffDuration);
      }
    }

    this.isShowingSequence = false;
    this.setButtonsDisabled(false);
    this.showStatus('请按顺序点击按钮', 'playing');
  }

  private async lightUpButton(color: Color): Promise<void> {
    const button = this.getButtonByColor(color);
    if (!button) return;

    button.classList.add('active');
    await this.delay(this.lightOnDuration);
    button.classList.remove('active');
  }

  private getButtonByColor(color: Color): HTMLButtonElement | null {
    return document.querySelector(`.color-btn[data-color="${color}"]`);
  }

  private startWarmup(steps: number): void {
    this.isWarmupMode = true;
    this.warmupTotalSteps = steps;
    this.warmupCorrectCount = 0;
    this.warmupPlayerIndex = 0;
    this.warmupSequence = [];

    for (let i = 0; i < steps; i++) {
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.warmupSequence.push(randomColor);
    }

    this.warmupSelectorEl.style.display = 'none';
    this.setButtonsDisabled(true);
    this.warmupBtns.forEach(btn => btn.disabled = true);
    this.skipWarmupBtn.disabled = true;

    this.showStatus(`热身开始 - 记住 ${steps} 步序列`, 'playing');
    this.showWarmupSequence();
  }

  private async showWarmupSequence(): Promise<void> {
    this.isShowingSequence = true;
    this.setButtonsDisabled(true);

    await this.delay(500);

    for (let i = 0; i < this.warmupSequence.length; i++) {
      const color = this.warmupSequence[i];
      await this.lightUpButton(color);

      if (i < this.warmupSequence.length - 1) {
        await this.delay(this.lightOffDuration);
      }
    }

    this.isShowingSequence = false;
    this.setButtonsDisabled(false);
    this.showStatus('请按顺序点击按钮', 'playing');
  }

  private async handleWarmupInput(color: Color): Promise<void> {
    if (!this.isWarmupMode || this.isShowingSequence) return;

    const expectedColor = this.warmupSequence[this.warmupPlayerIndex];
    const button = this.getButtonByColor(color);

    if (color === expectedColor) {
      this.warmupCorrectCount++;
      button?.classList.add('correct');
      await this.delay(200);
      button?.classList.remove('correct');

      this.warmupPlayerIndex++;

      if (this.warmupPlayerIndex === this.warmupSequence.length) {
        this.finishWarmup();
      }
    } else {
      button?.classList.add('wrong');
      await this.delay(500);
      button?.classList.remove('wrong');

      this.warmupPlayerIndex++;

      if (this.warmupPlayerIndex === this.warmupSequence.length) {
        this.finishWarmup();
      }
    }
  }

  private finishWarmup(): void {
    this.isWarmupMode = false;
    this.setButtonsDisabled(true);

    const accuracy = Math.round((this.warmupCorrectCount / this.warmupTotalSteps) * 100);

    const resultDiv = document.createElement('div');
    resultDiv.className = 'warmup-result';
    resultDiv.innerHTML = `
      热身完成！<br>
      正确: ${this.warmupCorrectCount} / ${this.warmupTotalSteps} 步<br>
      正确率: ${accuracy}%
    `;

    this.warmupSelectorEl.innerHTML = '';
    this.warmupSelectorEl.appendChild(resultDiv);

    const startGameBtn = document.createElement('button');
    startGameBtn.className = 'start-btn';
    startGameBtn.textContent = '开始正式游戏';
    startGameBtn.style.marginTop = '15px';
    startGameBtn.addEventListener('click', () => {
      this.warmupSelectorEl.style.display = 'none';
      this.startGame();
    });
    this.warmupSelectorEl.appendChild(startGameBtn);

    this.warmupSelectorEl.style.display = 'block';

    this.showStatus(`热身结束，正确率 ${accuracy}%`, 'success');
  }

  private skipWarmup(): void {
    this.warmupSelectorEl.style.display = 'none';
    this.startBtn.style.display = 'inline-block';
    this.showStatus('点击开始按钮开始游戏', '');
  }

  private async handlePlayerInput(color: Color): Promise<void> {
    if (this.isWarmupMode) {
      await this.handleWarmupInput(color);
      return;
    }

    if (!this.isPlaying || this.isShowingSequence) return;

    const expectedColor = this.sequence[this.playerIndex];
    const button = this.getButtonByColor(color);

    if (color === expectedColor) {
      button?.classList.add('correct');
      await this.delay(200);
      button?.classList.remove('correct');

      this.playerIndex++;

      if (this.playerIndex === this.sequence.length) {
        this.showStatus('正确！准备下一关...', 'success');
        this.setButtonsDisabled(true);
        await this.delay(1000);
        this.nextRound();
      }
    } else {
      button?.classList.add('wrong');
      await this.delay(500);
      button?.classList.remove('wrong');

      this.gameOver();
    }
  }

  private async gameOver(): Promise<void> {
    this.isPlaying = false;
    this.isWarmupMode = false;
    this.setButtonsDisabled(true);
    this.startBtn.disabled = false;

    const finalScore = this.level - 1;
    this.showStatus(`游戏结束！你完成了 ${finalScore} 关`, 'gameover');

    if (finalScore > this.highScore) {
      await this.saveHighScore(finalScore);
    }

    this.resetWarmupSelector();
  }

  private resetWarmupSelector(): void {
    this.warmupSelectorEl.innerHTML = `
      <h3>🔥 记忆热身</h3>
      <p>选择热身序列长度，不影响最高分</p>
      <div class="warmup-options">
        <button class="warmup-btn" data-steps="3">3 步</button>
        <button class="warmup-btn" data-steps="5">5 步</button>
        <button class="warmup-btn" data-steps="7">7 步</button>
      </div>
      <button id="skip-warmup-btn" class="skip-warmup-btn">跳过热身，直接开始</button>
    `;

    this.warmupSelectorEl.style.display = 'block';
    this.startBtn.style.display = 'none';

    const newWarmupBtns = this.warmupSelectorEl.querySelectorAll('.warmup-btn');
    const newSkipBtn = this.warmupSelectorEl.querySelector('#skip-warmup-btn') as HTMLButtonElement;

    newWarmupBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const steps = parseInt((e.target as HTMLButtonElement).dataset.steps || '3', 10);
        this.startWarmup(steps);
      });
    });

    newSkipBtn.addEventListener('click', () => this.skipWarmup());
  }

  private setButtonsDisabled(disabled: boolean): void {
    this.buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private showStatus(message: string, type: 'playing' | 'gameover' | 'success' | '' = ''): void {
    this.gameStatusEl.textContent = message;
    this.gameStatusEl.className = 'game-status';
    if (type) {
      this.gameStatusEl.classList.add(type);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

new ColorMemoryGame();
