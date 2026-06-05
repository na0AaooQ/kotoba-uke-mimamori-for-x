'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const manualImages = document.querySelectorAll('.manual-figure img');

  if (manualImages.length === 0) {
    return;
  }

  const isJapanese = document.documentElement.lang === 'ja';
  const labels = isJapanese
    ? {
        close: '拡大画像を閉じる',
        dialog: 'マニュアル画像の拡大表示',
        open: 'クリックして画像を拡大表示'
      }
    : {
        close: 'Close enlarged image',
        dialog: 'Enlarged manual image',
        open: 'Click to enlarge image'
      };

  const dialog = document.createElement('dialog');
  const closeButton = document.createElement('button');
  const enlargedImage = document.createElement('img');
  const caption = document.createElement('p');
  let activeImage = null;

  dialog.className = 'image-modal';
  dialog.setAttribute('aria-label', labels.dialog);

  closeButton.type = 'button';
  closeButton.className = 'image-modal__close';
  closeButton.setAttribute('aria-label', labels.close);
  closeButton.textContent = '×';

  enlargedImage.className = 'image-modal__image';
  caption.className = 'image-modal__caption';

  dialog.append(closeButton, enlargedImage, caption);
  document.body.append(dialog);

  function openModal(image) {
    const figureCaption = image.closest('.manual-figure')?.querySelector('figcaption');

    activeImage = image;
    enlargedImage.src = image.currentSrc || image.src;
    enlargedImage.alt = image.alt;
    caption.textContent = figureCaption?.textContent || image.alt;
    dialog.showModal();
  }

  function closeModal() {
    dialog.close();
  }

  for (const image of manualImages) {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-haspopup', 'dialog');
    image.setAttribute('aria-label', `${image.alt}. ${labels.open}`);

    image.addEventListener('click', () => openModal(image));
    image.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      openModal(image);
    });
  }

  dialog.addEventListener('click', closeModal);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      closeModal();
    }
  });
  dialog.addEventListener('close', () => {
    activeImage?.focus();
    activeImage = null;
  });
});
