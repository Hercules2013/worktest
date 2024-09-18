import { mount, flushPromises } from '@vue/test-utils';
import TodoList from '@/components/TodoList.vue';
import { generateClient } from 'aws-amplify/api';
import { addTodo } from '@/graphql/mutations';
import * as subscriptions from '@/graphql/subscriptions';

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn().mockReturnValue({
    graphql: jest.fn(),
  }),
}));

jest.mock('@/graphql/queries', () => ({
  listTodos: jest.fn(),
}));

jest.mock('@/graphql/mutations', () => ({
  addTodo: jest.fn(),
  deleteTodo: jest.fn(),
  updateTodoStatus: jest.fn(),
}));

jest.mock('@/graphql/subscriptions', () => ({
  onTodoAdded: jest.fn(),
  onTodoDeleted: jest.fn(),
  onTodoUpdated: jest.fn(),
}));

describe('TodoList.vue', () => {
  let client;

  beforeEach(() => {
    client = generateClient();

    client.graphql.mockImplementation(({ query }) => {
      if (query === subscriptions.onTodoAdded || query === subscriptions.onTodoDeleted || query === subscriptions.onTodoUpdated) {
        return {
          subscribe: jest.fn().mockImplementation(() => ({
            unsubscribe: jest.fn(),
          })),
        };
      }

      return Promise.resolve({
        data: {},
      });
    });
  });

  it('should render the todo list on mount', async () => {
    const todosMock = {
      data: {
        listTodos: [
          { id: 1, name: 'Test Todo 1', description: 'Description 1', completed: false },
          { id: 2, name: 'Test Todo 2', description: 'Description 2', completed: true },
        ],
      },
    };
    client.graphql.mockResolvedValueOnce(todosMock);

    const wrapper = mount(TodoList);

    await flushPromises();

    expect(wrapper.findAll('.card')).toHaveLength(2);
    expect(wrapper.text()).toContain('Test Todo 1');
    expect(wrapper.text()).toContain('Description 1');
    expect(wrapper.text()).toContain('Test Todo 2');
    expect(wrapper.text()).toContain('Description 2');
  });

  it('should handle API errors gracefully', async () => {
    client.graphql.mockRejectedValueOnce(new Error('API Error'));

    const wrapper = mount(TodoList);

    await flushPromises();

    expect(wrapper.text()).not.toContain('Test Todo 1');
  });

  it('should prevent adding an empty todo', async () => {
    const wrapper = mount(TodoList);

    await wrapper.find('button').trigger('click');

    expect(client.graphql).not.toHaveBeenCalledWith({ query: addTodo });
    expect(wrapper.find('.form-control').classes()).not.toContain('is-invalid');
  });
});
