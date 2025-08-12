import { createRouter, createWebHistory } from 'vue-router'
import taophong from '@/views/taophong.vue'
import chat from '@/views/chat.vue'

const routes = [
  { path: '/', name: 'taophong', component: taophong },
  { path: '/chat/:id', name: 'chat', component: chat }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
