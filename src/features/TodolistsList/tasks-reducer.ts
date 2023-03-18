import { AddTodolistActionType, RemoveTodolistActionType, SetTodolistsActionType } from './todolists-reducer'
import { ResultCods, TaskPriorities, TaskStatuses, TaskType, todolistsAPI, UpdateTaskModelType } from '../../api/todolists-api'
import { Dispatch } from 'redux'
import { AppRootStateType } from '../../app/store'
import { RequestStatusType, setErrorAC, SetErrorType, setStatusAC, SetStatusType } from '../../app/app-reducer'
import { handleServerAppError, handleServerNetworkError } from '../../utils/error-utils'
import axios, { AxiosError } from 'axios'

const initialState: TasksStateType = {}

export const tasksReducer = (state: TasksStateType = initialState, action: ActionsType): TasksStateType => {
    switch (action.type) {
        case 'REMOVE-TASK':
            return { ...state, [action.todolistId]: state[action.todolistId].filter(t => t.id !== action.taskId) }
        case 'ADD-TASK':
            return { ...state, [action.task.todoListId]: [action.task, ...state[action.task.todoListId]] }
        case 'UPDATE-TASK':
            return {
                ...state,
                [action.todolistId]: state[action.todolistId]
                    .map(t => t.id === action.taskId ? { ...t, ...action.model } : t)
            }
        case 'ADD-TODOLIST':
            return { ...state, [action.todolist.id]: [] }
        case 'REMOVE-TODOLIST':
            const copyState = { ...state }
            delete copyState[action.id]
            return copyState
        case 'SET-TODOLISTS': {
            const copyState = { ...state }
            action.todolists.forEach(tl => {
                copyState[tl.id] = []
            })
            return copyState
        }
        case 'SET-TASKS':
            return { ...state, [action.todolistId]: action.tasks }
        case 'CHANGE-TASK-ENTITY-STATUS':
            return {
                ...state, [action.todolistId]: state[action.todolistId]
                    .map(el => el.id === action.taskId ? { ...el, entityStatus: action.status } : el)
            }
        default:
            return state
    }
}

// actions
export const removeTaskAC = (taskId: string, todolistId: string) =>
    ({ type: 'REMOVE-TASK', taskId, todolistId } as const)
export const addTaskAC = (task: TaskType) =>
    ({ type: 'ADD-TASK', task } as const)
export const updateTaskAC = (taskId: string, model: UpdateDomainTaskModelType, todolistId: string) =>
    ({ type: 'UPDATE-TASK', model, todolistId, taskId } as const)
export const setTasksAC = (tasks: Array<TaskType>, todolistId: string) =>
    ({ type: 'SET-TASKS', tasks, todolistId } as const)
export const changeTaskEntityStatusAC = (taskId: string, todolistId: string, status: RequestStatusType) =>
    ({ type: 'CHANGE-TASK-ENTITY-STATUS', todolistId, taskId, status } as const)

// thunks
export const fetchTasksTC = (todolistId: string) => async (dispatch: Dispatch<ActionsType>) => {
    dispatch(setStatusAC('loading'))
    const res = await todolistsAPI.getTasks(todolistId)
    try {
        const tasks = res.data.items
        const action = setTasksAC(tasks, todolistId)
        dispatch(action)
        dispatch(setStatusAC('succeeded'))
    } catch (error) {
        if (axios.isAxiosError<{ message: string }>(error)) {
            const err = error.response ? error.response.data.message : error.message
            handleServerNetworkError(dispatch, err)
        }
    }


}
export const removeTaskTC = (taskId: string, todolistId: string) => (dispatch: Dispatch<ActionsType>) => {
    dispatch(setStatusAC('loading'))
    dispatch(changeTaskEntityStatusAC(taskId, todolistId ,'loading'))
    todolistsAPI.deleteTask(todolistId, taskId)
        .then(res => {
            if (res.data.resultCode === ResultCods.OK) {
                const action = removeTaskAC(taskId, todolistId)
                dispatch(action)
                dispatch(setStatusAC('succeeded'))
            } else {
                handleServerAppError(res.data, dispatch)
            }
        })
        .catch(error => {
            if (axios.isAxiosError<{ message: string }>(error)) {
                const err = error.response ? error.response.data.message : error.message
                handleServerNetworkError(dispatch, err)
            }
        })

}




export const addTaskTC = (title: string, todolistId: string) => (dispatch: Dispatch<ActionsType>) => {
    dispatch(setStatusAC('loading'))
    todolistsAPI.createTask(todolistId, title)
        .then(res => {
            if (res.data.resultCode === 0) {
                const task = res.data.data.item
                const action = addTaskAC(task)
                dispatch(action)
                dispatch(setStatusAC('succeeded'))
            } else {
                handleServerAppError(res.data, dispatch)
            }
        })
        .catch(error => {
            if (axios.isAxiosError<{ message: string }>(error)) {
                const err = error.response ? error.response.data.message : error.message
                handleServerNetworkError(dispatch, err)
            }
        })
}



export const updateTaskTC = (taskId: string, domainModel: UpdateDomainTaskModelType, todolistId: string) =>
    (dispatch: Dispatch<ActionsType>, getState: () => AppRootStateType) => {
        dispatch(setStatusAC('loading'))
        dispatch(changeTaskEntityStatusAC(taskId, todolistId ,'loading'))
        const state = getState()
        const task = state.tasks[todolistId].find(t => t.id === taskId)
        if (!task) {
            //throw new Error("task not found in the state");
            console.warn('task not found in the state')
            return
        }

        const apiModel: UpdateTaskModelType = {
            deadline: task.deadline,
            description: task.description,
            priority: task.priority,
            startDate: task.startDate,
            title: task.title,
            status: task.status,
            ...domainModel
        }

        todolistsAPI.updateTask(todolistId, taskId, apiModel)
            .then(res => {
                if (res.data.resultCode === ResultCods.OK) {
                    const action = updateTaskAC(taskId, domainModel, todolistId)
                    dispatch(action)
                    dispatch(setStatusAC('succeeded'))
                    dispatch(changeTaskEntityStatusAC(taskId, todolistId ,'succeeded'))

                } else {
                    handleServerAppError(res.data, dispatch)
                }
            })
            .catch((err: AxiosError<{ messages: string }>) => {
                const error = err.response ? err.response.data.messages : err.message
                handleServerNetworkError(dispatch, error)
            })
    }

// types
export type UpdateDomainTaskModelType = {
    title?: string
    description?: string
    status?: TaskStatuses
    priority?: TaskPriorities
    startDate?: string
    deadline?: string
}
export type TasksStateType = {
    [key: string]: Array<TaskType>
}
type ActionsType =
    | ReturnType<typeof removeTaskAC>
    | ReturnType<typeof addTaskAC>
    | ReturnType<typeof updateTaskAC>
    | AddTodolistActionType
    | RemoveTodolistActionType
    | SetTodolistsActionType
    | ReturnType<typeof setTasksAC>
    | SetStatusType
    | SetErrorType
    | ReturnType<typeof changeTaskEntityStatusAC>


