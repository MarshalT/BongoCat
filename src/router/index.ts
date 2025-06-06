import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHashHistory } from 'vue-router'

import Main from '../pages/main/index.vue'
import Preference from '../pages/preference/index.vue'
import LunchpadView from '../components/lunchpad/LunchpadView.vue'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/',
    component: Main,
  },
  {
    path: '/preference',
    component: Preference,
  },
  // {
  //   path: '/lunchpad',
  //   component: LunchpadView,
  // },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
