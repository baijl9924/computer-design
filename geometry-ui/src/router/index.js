import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: { name: 'workbench' }
  },
  {
    path: '/workbench',
    name: 'workbench',
    component: () => import('../views/FunctionWorkbench.vue')
  },
  {
    path: '/workbench-3d',
    name: 'workbench-3d',
    component: () => import('../views/FunctionWorkbench3D.vue')
  },
  {
    path: '/starfield',
    name: 'starfield',
    component: () => import('../views/FunctionStarfieldView.vue')
  },
  {
    path: '/error-book',
    name: 'error-book',
    component: () => import('../views/ErrorBookView.vue')
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
