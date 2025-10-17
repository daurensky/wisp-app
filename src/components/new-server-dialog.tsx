import { useForm } from '@tanstack/react-form'
import { Plus } from 'lucide-react'
import z from 'zod'
import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from './ui/field'
import { Input } from './ui/input'
import { createServer, Server } from '@/api/server'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

const formSchema = z.object({
  name: z
    .string()
    .min(1, { error: 'Название должно быть не короче 1 символа' })
    .max(32, { error: 'Название должно быть не длиннее 32 символа' }),
  avatar: z
    .file()
    .max(5 * 1024 * 1024, {
      error: 'Макс размер 5 МБ',
    })
    .mime(['image/png', 'image/jpeg', 'image/gif', 'image/webp'], {
      error: 'Загрузите картинку',
    })
    .nullable(),
})

export default function NewServerDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationKey: ['servers'],
    mutationFn: createServer,
    onSuccess: (server, _variables, _onMutateResult, context) => {
      context.client.setQueryData(['servers'], (old: Server[]) => [
        ...old,
        server,
      ])

      setIsOpen(false)
      navigate(`/server/${server.id}`)
    },
    onError: error => {
      toast(error.message)
    },
  })

  const form = useForm({
    defaultValues: {
      name: '',
      avatar: null as File | null,
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => mutation.mutate(value),
  })

  useEffect(() => {
    if (!isOpen) {
      form.reset()
      mutation.reset()
    }
  }, [isOpen, form, mutation])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger onClick={() => setIsOpen(true)} asChild>
        <button className="flex items-center justify-center w-10 h-10 bg-accent rounded-lg cursor-pointer">
          <Plus />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создайте свой сервер</DialogTitle>
          <DialogDescription>Создайте реально крутой сервак</DialogDescription>
        </DialogHeader>

        <form
          id="new-server-form"
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="avatar"
              children={field => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Название сервера
                    </FieldLabel>
                    <Input
                      type="file"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.files![0])}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
            <form.Field
              name="name"
              children={field => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Название сервера
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>

        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Назад
            </Button>
          </DialogClose>

          <Button type="submit" form="new-server-form">
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
