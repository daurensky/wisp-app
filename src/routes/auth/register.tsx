import { register } from '@/api/auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAccessTokenStore } from '@/store/auth-store'
import { useForm } from '@tanstack/react-form'
import { NavLink } from 'react-router'
import z from 'zod'
import { toast } from 'sonner'

const formSchema = z.object({
  email: z
    .email({ error: 'Неверный email' })
    .max(255, { error: 'Email должен быть не больше 255 символов' }),
  password: z
    .string()
    .min(8, { error: 'Пароль должен быть не меньше 8 символов' })
    .max(255, {
      error: 'Пароль должен быть не больше 255 символов',
    }),
  username: z
    .string()
    .min(2, {
      error: 'Имя пользователя должно быть не меньше 8 символов',
    })
    .max(32, {
      error: 'Имя пользователя должно быть не больше 32 символов',
    })
    .regex(/^[a-zA-Z0-9_.]+$/, {
      message:
        'Можно использовать только буквы, цифры, нижнее подчёркивание и точки',
    }),
  name: z
    .string()
    .max(32, { error: 'Отображаемое имя должно быть не больше 32 символов' }),
})

export default function Register() {
  const { setAccessToken } = useAccessTokenStore()

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      username: '',
      name: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const { token } = await register(value)
        setAccessToken(token)
      } catch (e) {
        toast('Произошла ошибка')
      }
    },
  })

  return (
    <main className="grow flex">
      <Card className="m-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Создать учетную запись</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="register-form"
            onSubmit={e => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.Field
                name="email"
                children={field => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        type="email"
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
              <form.Field
                name="username"
                children={field => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Имя пользователя
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
              <form.Field
                name="name"
                children={field => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Отображаемое имя
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
              <form.Field
                name="password"
                children={field => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Пароль</FieldLabel>
                      <Input
                        type="password"
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
        </CardContent>
        <CardFooter>
          <Field orientation="vertical">
            <Button type="submit" form="register-form" className="w-full">
              Далее
            </Button>
            <NavLink to="/login">
              <Button variant="link" className="w-full">
                Войти
              </Button>
            </NavLink>
          </Field>
        </CardFooter>
      </Card>
    </main>
  )
}
