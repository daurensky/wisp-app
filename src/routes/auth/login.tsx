import z from 'zod'
import { useForm } from '@tanstack/react-form'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Button } from '@/components/ui/button'
import { NavLink } from 'react-router'

const formSchema = z.object({
  email: z
    .email({ error: 'Неверный email' })
    .max(255, { error: 'Email должен быть не длиннее 255 символов' }),
  password: z
    .string()
    .min(8, { error: 'Пароль должен быть не короче 8 символов' })
    .max(255, {
      error: 'Пароль должен быть не длиннее 255 символов',
    }),
})

export default function Login() {
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      console.log(value)
    },
  })

  return (
    <main className="grow flex">
      <Card className="m-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>С возвращением!</CardTitle>
          <CardDescription>Рады видеть вас снова!</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="login-form"
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
            <Button type="submit" form="login-form" className="w-full">
              Войти
            </Button>
            <NavLink to="/register">
              <Button variant="link" className="w-full">
                Зарегистрироваться
              </Button>
            </NavLink>
          </Field>
        </CardFooter>
      </Card>
    </main>
  )
}
