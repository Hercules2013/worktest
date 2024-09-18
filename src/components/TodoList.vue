<template>
  <div class="container">
    <div class="add-todo">
      <h1 class="text-center my-4">Todo List</h1>
      <div class="mb-3">
        <input v-model="newTodoName" @keyup.enter="addTodo" class="form-control" placeholder="Todo name" />
      </div>
      <div class="mb-3">
        <input v-model="newTodoDescription" @keyup.enter="addTodo" class="form-control" placeholder="Todo description" />
      </div>
      <button @click="newTodo" class="btn btn-primary w-100">Add Todo</button>
    </div>

    <div class="todo-list mt-5">
      <div class="card mb-3" v-for="(todo, index) in todos" :key="index">
        <div class="card-body d-flex justify-content-between align-items-start grid gap-0 column-gap-3">
          <input 
            class="form-check-input" 
            type="checkbox" 
            :checked="todo.completed" 
            @change="toggleCompleted(todo.id, !todo.completed)"
          />
          <div :class="['flex-grow-1', 'text-start', 'pe-2', { 'text-decoration-line-through': todo.completed }]">
            <h5 class="card-title">{{ todo.name }}</h5>
            <p class="card-text">{{ todo.description }}</p>
          </div>
          <button @click="removeTodo(todo.id)" class="btn btn-danger">Remove</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { generateClient } from 'aws-amplify/api';
const client = generateClient();

import { listTodos } from '@/graphql/queries';
import { addTodo, deleteTodo, updateTodoStatus } from '@/graphql/mutations';
import * as subscriptions from '@/graphql/subscriptions';

export default {
  setup() {
    const todos = ref([]);
    const newTodoName = ref('');
    const newTodoDescription = ref('');

    // Fetch Todos
    const fetchTodos = async () => {
      try {
        const result = await client.graphql({ query: listTodos });
        todos.value = result.data.listTodos;
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    };

    // Add Todo
    const newTodo = async () => {
      if (newTodoName.value.trim()) {
        const todoDetails = { 
          name: newTodoName.value, 
          description: newTodoDescription.value || '' 
        };
        try {
          await client.graphql({ 
            query: addTodo,
            variables: todoDetails
          })
          newTodoName.value = '';
          newTodoDescription.value = '';
        } catch (error) {
          console.error('Error adding todo:', error);
        }
      }
    };

    // Remove Todo
    const removeTodo = async (id) => {
      try {
        const result = await client.graphql({
          query: deleteTodo,
          variables: { id }
        });

        if (result.data.deleteTodo) {
          todos.value = todos.value.filter(todo => todo.id !== id);
        }
      } catch (error) {
        console.error('Error deleting todo:', error);
      }
    }

    // Toggle Completed or Not
    const toggleCompleted = async (id, completed) => {
      console.log(id, completed);
      try {
        const result = await client.graphql({
          query: updateTodoStatus,
          variables: { id, completed }
        });

        if (result.data.updateTodoStatus) {
          const index = todos.value.findIndex(todo => todo.id === id);

          if (index !== -1) {
            todos.value[index].completed = result.data.updateTodoStatus.completed;
          }
        }
      } catch (error) {
        console.error('Error updating todo status:', error);
      }
    }

    // Subscribe to todos
    const subscribeToNewTodos = () => {
      const newSub = client
        .graphql({ query: subscriptions.onTodoAdded })
        .subscribe({
          next: ({ data }) => {
            const newTodoItem = data.onTodoAdded;
            todos.value.push(newTodoItem);
          },
          error: (error) => console.error('Error on todo subscription:', error),
        });

      const deleteSub = client
        .graphql({ query: subscriptions.onTodoDeleted })
        .subscribe({
          next: ({ data }) => {
            const deleteTodoItem = data.onTodoDeleted;
            todos.value = todos.value.filter(todo => todo.id !== deleteTodoItem.id);
          },
          error: (error) => console.error('Error on todo subscription:', error),
        });

      const updateSub = client
        .graphql({ query: subscriptions.onTodoUpdated })
        .subscribe({
          next: ({ data }) => {
            const updateTodoItem = data.onTodoUpdated;
            const index = todos.value.findIndex(todo => todo.id === updateTodoItem.id);

            if (index !== -1) {
              todos.value[index].completed = updateTodoItem.completed;
            }
          },
          error: (error) => console.error('Error on todo subscription:', error),
        });

      onUnmounted(() => {
        newSub.unsubscribe();
        deleteSub.unsubscribe();
        updateSub.unsubscribe();
      });
    };

    onMounted(() => {
      fetchTodos();
      subscribeToNewTodos();
    });

    return {
      todos,
      newTodoName,
      newTodoDescription,
      newTodo,
      removeTodo,
      toggleCompleted,
    };
  }
}
</script>

<style scoped>
.add-todo {
  max-width: 500px;
  margin: 0 auto;
}

.todo-list {
  max-width: 600px;
  margin: 0 auto;
}
</style>