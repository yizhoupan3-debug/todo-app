

const plantAssets = {
  classic: ['sprout.png', 'sprout_growing.png', 'sprout_stage.png', 'young_plant_stage.png', 'orange_tree.png'],
  sunflower: ['sunflower_seed.svg', 'sunflower_sprout.svg', 'sunflower_growing.png', 'sunflower_young.svg', 'sunflower.png'],
  succulent: ['seed.png', 'succulent_sprout.svg', 'succulent_young.svg', 'succulent_bud.svg', 'cactus.png'],
  cherry: ['cherry_seed.svg', 'sakura_growing.png', 'cherry_young.svg', 'cherry_bud.svg', 'sakura.png'],
};

function getPlantStage(streak, type = 'classic') {
  const assets = plantAssets[type] || plantAssets.classic;
  let index = 0;
  if (streak >= 15) index = 4;
  else if (streak >= 10) index = 3;
  else if (streak >= 6) index = 2;
  else if (streak >= 3) index = 1;
  else index = 0;
  const stages = ['Seed', 'Sprout', 'Young', 'Bud', 'Bloom'];
  
  let imgPath = assets[index];
  if (imgPath.includes('/')) {
     return { stage: stages[index], image: imgPath }; // Absolute URL
  }
  
  // Decide whether to pull from our local shop trees or bloomify defaults
  let basePath = '/img/garden/bloomify/';
  if (['sprout.png', 'sprout_growing.png', 'sprout_stage.png', 'orange_tree.png', 'sunflower_growing.png', 'sunflower.png', 'seed.png', 'cactus.png', 'sakura_growing.png', 'sakura.png'].includes(imgPath)) {
      basePath = '/img/trees/';
  }
  
  return {
    stage: stages[index],
    image: basePath + imgPath
  };
}


export function renderGardenGrid(container, tasks, onToggle, onDelete, onArchive) {
  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="bloomify-emptyState"><p>Your garden is empty. Add a habit to start growing! 🌱</p></div>';
    return;
  }

  const gridHtml = tasks.map(task => renderPlantCard(task)).join('');
  container.innerHTML = '<div class="bloomify-grid">' + gridHtml + '</div>';

  tasks.forEach(task => {
    const card = container.querySelector('#plant-card-' + task.id);
    if (!card) return;

    const toggleBtn = card.querySelector('.bloomify-toggleBtn');
    if (toggleBtn) {
       toggleBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         onToggle(task);
       });
    }

    const harvestBtn = card.querySelector('.bloomify-harvestBtn');
    if (harvestBtn) {
      harvestBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         onArchive(task);
      });
    }

    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         onDelete(task);
      });
    }

    const flipBtn = card.querySelector('.btn-flip');
    if (flipBtn) {
      flipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.querySelector('.bloomify-cardWrapper').classList.add('bloomify-flipped');
      });
    }

    const closeBtn = card.querySelector('.bloomify-closeBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.querySelector('.bloomify-cardWrapper').classList.remove('bloomify-flipped');
      });
    }
  });
}

function renderPlantCard(task) {
  const streak = task.streak || Math.floor(Math.random() * 20);
  const plantType = task.plantType || 'classic';
  const stageInfo = getPlantStage(streak, plantType);
  const isCompletedToday = task.completed;
  const canHarvest = streak >= 30;

  let btnHtml = '';
  if (canHarvest) {
      btnHtml = '<button class="bloomify-harvestBtn" title="Harvest">Harvest 🏆</button>';
  } else {
      btnHtml = '<button class="bloomify-toggleBtn">' + (isCompletedToday ? 'Done! ✔' : 'Water 💧') + '</button>';
  }

  return '<div id="plant-card-' + task.id + '" class="bloomify-cardWrapper">' +
      '<div class="bloomify-cardInner">' +
          '<div class="bloomify-cardFace bloomify-cardFront ' + (isCompletedToday ? 'bloomify-completed' : '') + '">' +
              '<div class="bloomify-plantContainer" title="Pet me! 💖">' +
                  '<img src="' + stageInfo.image + '" alt="' + stageInfo.stage + '" class="bloomify-plantImage ' + (isCompletedToday ? 'bloomify-bounce' : '') + '" />' +
              '</div>' +
              '<div class="bloomify-info">' +
                  '<div class="bloomify-header">' +
                      '<span class="bloomify-icon">' + (task.icon || '🌱') + '</span>' +
                      '<h3 class="bloomify-name">' + task.text + '</h3>' +
                  '</div>' +
                  '<div class="bloomify-stats">' +
                      '<span class="bloomify-streak">🔥 ' + streak + ' days</span>' +
                      '<span class="bloomify-stageLabel">' + stageInfo.stage + '</span>' +
                  '</div>' +
                  '<div class="bloomify-actions">' +
                      btnHtml +
                      '<button class="bloomify-iconBtn btn-flip" title="View Stats">📊</button>' +
                      '<button class="bloomify-iconBtn btn-delete" title="Delete">🗑️</button>' +
                  '</div>' +
              '</div>' +
          '</div>' +
          '<div class="bloomify-cardFace bloomify-cardBack">' +
              '<div class="bloomify-backHeader">' +
                  '<h3>' + task.text + ' Stats</h3>' +
                  '<button class="bloomify-closeBtn">×</button>' +
              '</div>' +
              '<div class="bloomify-backStats">' +
                  '<p>Current Streak: <strong>' + streak + '</strong></p>' +
              '</div>' +
          '</div>' +
      '</div>' +
  '</div>';
}
