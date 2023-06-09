import { Dispatch } from "redux"
import { AppActionsType, setErrorAC, setStatusAC } from "../app/app-reducer"
import { ResponseType } from '../api/todolists-api'

export const handleServerNetworkError = (dispatch: ErrorUtilsDispatchType, error: string) => {
    dispatch(setStatusAC('failed'))
    dispatch(setErrorAC(error))
}

export const handleServerAppError = <T>(data: ResponseType<T>, dispatch: ErrorUtilsDispatchType) => {
    if (data.messages.length) {
        dispatch(setErrorAC(data.messages[0]))
    } else {
        // крашиться приложение, но ошибки бек не вернул
        dispatch(setErrorAC('Some error'))
    }
    dispatch(setStatusAC('idle'))
}





type ErrorUtilsDispatchType = Dispatch<AppActionsType>